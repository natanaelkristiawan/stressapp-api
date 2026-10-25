import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { Activity } from '../entity/activity.entity';
import { PsychologistLocation } from '../entity/psychologist-location.entity';
import {
  LocationInputDto,
  LocationListDto,
  UpdateLocationDto,
} from './psychologists.dto';

/** Maps only directory contract fields; internal deduplication keys never leave the API. */
function locationResponse(row: PsychologistLocation) {
  return {
    id: row.id,
    name: row.name,
    branch: row.branch,
    city: row.city,
    address: row.address,
    phone: row.phone,
    contactType: row.contactType,
    contactNotes: row.contactNotes,
    website: row.website,
    serviceMode: row.serviceMode,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Identifies a named branch within a city independently of address/contact edits and row order. */
export function locationKey(
  input: Pick<LocationInputDto, 'name' | 'branch' | 'city'>,
) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        [input.name, input.branch, input.city].map((value) =>
          value.trim().toLocaleLowerCase('id'),
        ),
      ),
    )
    .digest('hex');
}
/** Enforces paired coordinates and permits only ordinary public HTTP website links. */
export function validateLocation(input: LocationInputDto) {
  if ((input.latitude === null) !== (input.longitude === null)) {
    throw new BadRequestException(
      'Provide both latitude and longitude, or leave both blank.',
    );
  }
  if (input.serviceMode === 'online' && input.latitude !== null) {
    throw new BadRequestException(
      'Online-only services cannot have physical coordinates.',
    );
  }
  if (input.website) {
    try {
      const url = new URL(input.website);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        !url.hostname.includes('.')
      ) {
        throw new Error('URL');
      }
    } catch {
      throw new BadRequestException(
        'Use an HTTP(S) website or social media URL.',
      );
    }
  }
}
@Injectable()
export class PsychologistsService {
  constructor(@InjectDataSource('mimate') private readonly db: DataSource) {}
  /** Returns published cities for the mobile filter without sample locations. */
  async cities() {
    const rows = await this.db
      .getRepository(PsychologistLocation)
      .createQueryBuilder('p')
      .select('p.city', 'city')
      .where('p.status = :status', { status: 'published' })
      .distinct(true)
      .orderBy('p.city', 'ASC')
      .getRawMany<{ city: string }>();
    return rows.map((row) => row.city);
  }
  /** Filters and paginates at the database; nearest ordering places unknown distances last. */
  async list(input: LocationListDto, member = false) {
    if ((input.latitude === undefined) !== (input.longitude === undefined)) {
      throw new BadRequestException('Provide both coordinates.');
    }
    const query = this.db
      .getRepository(PsychologistLocation)
      .createQueryBuilder('p');
    if (member || input.status) {
      query.andWhere('p.status = :status', {
        status: member ? 'published' : input.status,
      });
    }
    if (input.search) {
      // LOCATE treats user wildcards as literal characters.
      query.andWhere(
        '(LOCATE(:search, p.name) > 0 OR LOCATE(:search, p.branch) > 0 OR LOCATE(:search, p.city) > 0)',
        { search: input.search },
      );
    }
    if (input.city) {
      query.andWhere('p.city = :city', { city: input.city });
    }
    const total = await query.getCount();
    const hasOrigin = member && input.latitude !== undefined;
    if (hasOrigin) {
      query
        .addSelect(
          "CASE WHEN p.serviceMode = 'onsite' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN 6371 * 2 * ASIN(SQRT(LEAST(1, GREATEST(0, POWER(SIN(RADIANS(p.latitude - :latitude) / 2), 2) + COS(RADIANS(:latitude)) * COS(RADIANS(p.latitude)) * POWER(SIN(RADIANS(p.longitude - :longitude) / 2), 2))))) ELSE NULL END",
          'distanceKm',
        )
        .setParameters({ latitude: input.latitude, longitude: input.longitude })
        .orderBy('distanceKm IS NULL', 'ASC')
        .addOrderBy('distanceKm', 'ASC');
    } else {
      query.orderBy(`p.${input.sort}`, input.order === 'desc' ? 'DESC' : 'ASC');
    }
    query
      .addOrderBy('p.id', 'ASC')
      .offset((input.page - 1) * input.pageSize)
      .limit(input.pageSize);
    const result = await query.getRawAndEntities();
    const items = result.entities.map((row, index) => {
      const rawDistance = result.raw[index]?.distanceKm;
      return {
        ...locationResponse(row),
        distanceKm:
          hasOrigin && rawDistance !== null && rawDistance !== undefined
            ? Number(rawDistance)
            : null,
      };
    });
    return { items, total, page: input.page, pageSize: input.pageSize };
  }
  /** Loads one branch for an authenticated CMS editor, including unpublished records. */
  async detail(id: number) {
    const row = await this.db
      .getRepository(PsychologistLocation)
      .findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Branch not found.');
    }
    return { ...locationResponse(row), distanceKm: null };
  }
  /** Soft deletes under a revision lock; related rows and history remain stored. */
  async remove(id: number, revision: number, actorId: number) {
    return this.db.transaction(async (manager) => {
      const repository = manager.getRepository(PsychologistLocation);
      const record = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) {
        throw new NotFoundException('Location not found.');
      }
      if (record.revision !== revision) {
        throw new ConflictException(
          'This record changed. Reload before deleting.',
        );
      }
      record.revision += 1;
      record.status = 'draft';
      await repository.save(record);
      await repository.softDelete(id);
      await manager.getRepository(Activity).save({
        action: 'psychologist-delete',
        source: 'cms-psychologists',
        message: JSON.stringify({
          actorId,
          recordId: id,
          revision: record.revision,
        }),
      });
      return { id };
    });
  }
  /** Creates or revision-checks one branch; duplicate identities never overwrite another branch. */
  async save(
    input: LocationInputDto | UpdateLocationDto,
    actorId: number,
    id?: number,
  ) {
    validateLocation(input);
    try {
      return await this.db.transaction(async (manager) => {
        const repository = manager.getRepository(PsychologistLocation);
        let row = repository.create();
        if (id !== undefined) {
          row = await repository.findOne({
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!row) {
            throw new NotFoundException('Location not found.');
          }
          if (!('revision' in input) || row.revision !== input.revision) {
            throw new ConflictException(
              'This location changed. Reload before saving.',
            );
          }
        }
        const {
          name,
          branch,
          city,
          address,
          phone,
          contactType,
          contactNotes,
          website,
          serviceMode,
          latitude,
          longitude,
          status,
        } = input;
        Object.assign(row, {
          name,
          branch,
          city,
          address,
          phone,
          contactType,
          contactNotes,
          website,
          serviceMode,
          latitude,
          longitude,
          status,
          identityKey: locationKey(input),
          revision: id ? row.revision + 1 : 1,
        });
        const saved = await repository.save(row);
        await manager.getRepository(Activity).save({
          action: id ? 'psychologist-edit' : 'psychologist-create',
          source: 'cms-psychologists',
          message: JSON.stringify({
            actorId,
            locationId: saved.id,
            revision: saved.revision,
          }),
        });
        return { ...locationResponse(saved), distanceKm: null };
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('This provider branch already exists.');
      }
      throw error;
    }
  }
}
