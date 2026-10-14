import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(SeedModule);
    const seeder = app.get(SeedService);

    try {
        await seeder.run();
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
