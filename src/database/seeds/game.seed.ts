import { DataSource } from 'typeorm';
import { GameLevel } from '../../entity/game-level.entity';
import { Game } from '../../entity/game.entity';
import { GameStep } from '../../entity/game-step.entity';

export async function seedGames(db: DataSource): Promise<void> {
  const levelRepo = db.getRepository(GameLevel);
  const gameRepo = db.getRepository(Game);
  const stepRepo = db.getRepository(GameStep);

  const levelsData = [
    {
      levelNumber: 1,
      title: 'Misi Level 1',
      targetDescription:
        '<p>Tantangan pada Level 1 ini merupakan tantangan misi untuk memahami diri sendiri dengan lebih baik dan belajar mengapresiasi hal-hal baik dalam hidup.</p><p>Pilih misi yang harus Anda selesaikan dalam 7 hari ke depan!</p>',
      isActive: true,
      games: [
        {
          key: 'aktivitas-harian',
          name: 'Aktifitas Harian',
          orderIndex: 1,
          pointsReward: 50,
          successMessage:
            'Selamat Anda telah menyelesaikan 1 dari 2 tantangan yang ada. Ayo selesaikan Tantangan selanjutnya!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Aktifitas Harian',
              description:
                'Anda diajak untuk melakukan aktivitas sehari-hari dengan penuh semangat, misalnya: Anda mencoba untuk keluar ruangan kamar dan berjalan santai di pagi/sore hari, atau melakukan hobi Anda sukai!',
              instruction:
                'Tujuan latihan ini untuk melakukan hal sederhana yang dapat meningkatkan energi dan suasana hati Anda.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Aktifitas Harian',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post' as const,
              title: 'Aktifitas Harian',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
            },
          ],
        },
        {
          key: 'apresiasi-diri',
          name: 'Apresiasi Diri',
          orderIndex: 2,
          pointsReward: 50,
          successMessage:
            'Selamat Anda telah berhasil menyelesaikan seluruh misi pada Level 1 dengan baik. Apresiasi hal kecil yang terjadi dalam hidup akan membuat kita belajar mensyukuri berkat yang ada. Ayo selesaikan Tantangan di level 2!!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Apresiasi Diri',
              description:
                'Tulis lima hal yang membuat Anda merasa bersyukur. Hal-hal yang Anda tulis bisa berupa hal yang relatif kecil ("Nasi goreng yang saya makan siang ini enak banget!") atau hal yang relatif besar ("Senang sekali hari ini bisa nonton film bareng gebetan").',
              instruction:
                'Tujuan latihan ini adalah untuk mengingat peristiwa, pengalaman, orang, atau hal baik dalam hidup Anda, lalu menikmati emosi positif yang muncul karenanya.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Apresiasi Diri',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'list-input' as const,
              title: 'Apresiasi Diri',
              description: '',
              instruction: '',
            },
          ],
        },
      ],
    },
    {
      levelNumber: 2,
      title: 'Misi Level 2',
      targetDescription: null,
      isActive: true,
      games: [
        {
          key: 'psikoedukasi-kesepian-and-stigma',
          name: 'Psikoedukasi Kesepian & Stigma',
          orderIndex: 1,
          pointsReward: 100,
          successMessage:
            'Selamat Anda telah menyelesaikan 1 dari 2 tantangan yang ada. Ayo selesaikan Tantangan selanjutnya!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Psikoedukasi Kesepian & Stigma',
              description:
                'Kesepian didefinisikan sebagai perasaan distres yang muncul ketika terdapat ketidaksesuaian antara hubungan sosial yang diinginkan dengan hubungan sosial yang benar-benar dimiliki.',
              descriptionExtra:
                'Seseorang bisa memiliki ribuan pengikut namun tetap merasa tidak ada yang benar-benar memahaminya. Stigma terkait kesepian muncul pada diri sendiri yang membuat seseorang malu mengakui dirinya kesepian dan pada masyarakat sekitar yang menganggap kesepian sebagai tanda kelemahan.',
              instruction:
                'Tantangan pada misi ini, Anda akan diminta untuk menonton video konten terkait kesepian dan stigma yang ada. Refleksikan diri Anda setelah menonton video dengan menjawab pertanyaan!',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Psikoedukasi Kesepian & Stigma',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post-with-video' as const,
              title: 'Psikoedukasi Kesepian & Stigma',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
              videoUrl:
                'https://www.youtube.com/watch?v=O4c8VR5hJaw&list=RDO4c8VR5hJaw&start_radio=1',
            },
          ],
        },
        {
          key: 'latihan-fokus-and-pernapasan',
          name: 'Latihan Fokus & Pernapasan',
          orderIndex: 2,
          pointsReward: 100,
          successMessage:
            'Selamat Anda telah berhasil menyelesaikan seluruh misi pada Level 2 dengan baik. Apresiasi hal kecil yang terjadi dalam hidup akan membuat kita belajar mensyukuri berkat yang ada. Ayo selesaikan Tantangan di level 3!!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Latihan Fokus & Pernapasan',
              description:
                'Mindfulness merupakan cara untuk menjaga kesehatan mental dengan tujuan membuat seseorang lebih fokus dengan situasi dan masalah yang sedang dihadapi, menerimanya dan tidak menghakimi.',
              descriptionExtra:
                'Mindfulness akan membantu lebih sadar akan keadaan sekitar serta mampu menerima emosi secara terbuka. Latihan fokus dan pernafasan bertujuan untuk memusatkan perhatian penuh dan melepaskan ketegangan atau stress yang ada dipikiran.',
              instruction:
                'Tantangan pada misi ini, Anda akan diminta untuk melakukan latihan fokus dan latihan pernafasan. Tonton video panduan dan berikan komentar Anda terkait pengalaman setelah melakukannya.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Latihan Fokus & Pernapasan',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post-with-video' as const,
              title: 'Latihan Fokus & Pernapasan',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
              videoUrl:
                'https://www.youtube.com/watch?v=O4c8VR5hJaw&list=RDO4c8VR5hJaw&start_radio=1',
            },
          ],
        },
      ],
    },
    {
      levelNumber: 3,
      title: 'Misi Level 3',
      targetDescription:
        '<p>Tantangan pada Level 3 merupakan semangat yang dapat Anda lakukan untuk memulai berinteraksi dengan orang-orang yang ada di sekitar lingkungan Anda. Pilihlah misi yang dapat Anda kerjakan dalam 7 hari ke depan.</p><p>Indikator keberhasilan dari misi yang Anda pilih adalah ketika Anda telah melakukan misi yang ada. Keberhasilan tidak dinilai dari respons orang lain terhadap hal yang telah Anda lakukan.</p>',
      isActive: true,
      games: [
        {
          key: 'senyum-sapa-salam-3s',
          name: 'Senyum, Sapa, Salam (3S)',
          orderIndex: 1,
          pointsReward: 150,
          successMessage:
            'Selamat Anda telah menyelesaikan 1 dari 2 tantangan yang ada. Ayo selesaikan Tantangan selanjutnya!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Senyum, Sapa, Salam (3S)',
              description:
                'Budaya Senyum dan Sapa (sering digabungkan dalam tradisi 3S: Senyum, Salam, Sapa) merupakan salah satu manifestasi utama dari nilai-nilai kebudayaan Indonesia yang mengutamakan keramahan, gotong royong, dan keharmonisan sosial (kerukunan).',
              instruction:
                'Tujuan dari kegiatan 3S ini untuk menunjukkan suasana yang hangat dalam mencairkan suasana ketika Anda berada disekitar orang lain. Ayok mulai dengan tersenyum dan lakukan sapaan sederhana seperti "Halo Pak, Ibu, Mas, Mbak, Akang, Teteh! pada orang yang Anda temui di kampus atau di rumah."',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Senyum, Sapa, Salam (3S)',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post' as const,
              title: 'Senyum, Sapa, Salam (3S)',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
            },
          ],
        },
        {
          key: 'kirim-pesan',
          name: 'Kirim Pesan',
          orderIndex: 2,
          pointsReward: 150,
          successMessage:
            'Selamat Anda telah berhasil menyelesaikan seluruh misi pada Level 3 dengan baik. Apresiasi hal kecil yang terjadi dalam hidup akan membuat kita belajar mensyukuri berkat yang ada. Ayo selesaikan Tantangan di level 4!!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Kirim Pesan',
              description:
                'Mengirimkan pesan singkat kepada teman, orang tua dan sahabat memiliki tujuan baik untuk membangun dan memelihara relasi sosial.',
              instruction:
                'Kamu juga dapat menunjukkan perhatian dan kepedulian dengan menanyakan kabar ataupun memberikan kata-kata penyemangat. Pesan hangat dan perhatian bisa dimulai dari menyapa menanyakan kabar, misalnya: "Halo, apa kabar? Semoga harimu lancar dan menyenangkan ya."',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Kirim Pesan',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post' as const,
              title: 'Kirim Pesan',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
            },
          ],
        },
      ],
    },
    {
      levelNumber: 4,
      title: 'Misi Level 4',
      targetDescription:
        '<p>Selamat Anda telah berhasil mencapai level akhir dari misi perjalanan ini. Target pada level 4 mencoba membantu Anda untuk dapat berinteraksi sosial dengan teman-teman dan orang yang ada di sekitar dengan lebih baik.</p><p>Ingat bahwa indikator keberhasilan dari misi ini bukanlah respons yang diberikan dari orang lain, melainkan keberanian Anda dalam mencoba membuka diri dan menjalankan misi yang ada. Ayo semangat selesaikan misi ini dan bertumbuh menjadi pribadi yang lebih baik lagi!</p>',
      isActive: true,
      games: [
        {
          key: 'tindakan-kebaikan-spontan',
          name: 'Tindakan Kebaikan Spontan',
          orderIndex: 1,
          pointsReward: 200,
          successMessage:
            'Selamat Anda telah menyelesaikan 1 dari 3 tantangan yang ada. Ayo selesaikan Tantangan selanjutnya!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Tindakan Kebaikan Spontan',
              description:
                'Lakukan satu tindakan kebaikan kecil yang spontan kepada seseorang di sekitar Anda hari ini tanpa mengharapkan imbalan.',
              instruction:
                'Kebaikan kecil dapat membawa dampak positif yang besar bagi Anda dan orang lain.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Tindakan Kebaikan Spontan',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post-with-popup' as const,
              title: 'Tindakan Kebaikan Spontan',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
              reflectiveTitle: 'Pertanyaan Reflektif',
              reflectiveQuestion:
                'Bagaimana perasaan Anda setelah melakukan kebaikan spontan? Ingat bahwa keberhasilan misi ini bukan dari respon orang disekitar Anda melainkan ketika Anda berani untuk melakukan tindakan nyata.',
            },
          ],
        },
        {
          key: 'ajak-teman',
          name: 'Ajak Teman',
          orderIndex: 2,
          pointsReward: 200,
          successMessage:
            'Selamat Anda telah menyelesaikan 2 dari 3 tantangan yang ada. Ayo selesaikan Tantangan selanjutnya!',
          haveNextLevel: true,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Ajak Teman',
              description:
                'Ajak teman atau rekan untuk melakukan aktivitas bersama, seperti makan siang bareng, jalan santai, atau berdiskusi ringan.',
              instruction:
                'Buka ruang untuk kebersamaan dan pererat hubungan pertemanan.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Ajak Teman',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post-with-popup' as const,
              title: 'Ajak Teman',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
              reflectiveTitle: 'Pertanyaan Reflektif',
              reflectiveQuestion:
                'Bagaimana perasaan Anda setelah mengajak teman untuk beraktivitas bersama? Apakah ada pengalaman baru yang menyenangkan?',
            },
          ],
        },
        {
          key: 'gabung-komunitas-hobi',
          name: 'Gabung Komunitas/Hobi',
          orderIndex: 3,
          pointsReward: 200,
          successMessage:
            'Selamat Anda telah berhasil menyelesaikan seluruh misi pada Level 4 dan menyelesaikan perjalanan misi ini dengan sangat baik!',
          haveNextLevel: false,
          steps: [
            {
              stepOrder: 1,
              layout: 'detail' as const,
              title: 'Gabung Komunitas/Hobi',
              description:
                'Cari dan ikuti komunitas atau kegiatan yang sesuai dengan minat dan hobi yang Anda sukai.',
              instruction:
                'Bertemu orang-orang dengan ketertarikan serupa dapat memperluas relasi dan rasa memiliki.',
            },
            {
              stepOrder: 2,
              layout: 'convident' as const,
              title: 'Gabung Komunitas/Hobi',
              description: 'Seberapa yakin Anda berhasil menyelesaikan misi ini?',
              instruction: '*drag icon sesuai ekspektasi Anda',
            },
            {
              stepOrder: 3,
              layout: 'post-with-popup' as const,
              title: 'Gabung Komunitas/Hobi',
              description:
                'Deskripsikan aktivitas Anda, Anda bisa menuliskan note, memuat foto, atau merekam audio.',
              instruction: '',
              reflectiveTitle: 'Pertanyaan Reflektif',
              reflectiveQuestion:
                'Bagaimana pengalaman Anda saat bergabung dan berinteraksi dalam komunitas atau kelompok hobi baru? Apa hal positif yang Anda rasakan?',
            },
          ],
        },
      ],
    },
  ];

  let levelsSeeded = 0;
  let gamesSeeded = 0;
  let stepsSeeded = 0;

  for (const levelData of levelsData) {
    let level = await levelRepo.findOne({
      where: { levelNumber: levelData.levelNumber },
    });
    if (!level) {
      level = levelRepo.create({
        levelNumber: levelData.levelNumber,
        title: levelData.title,
        targetDescription: levelData.targetDescription,
        isActive: levelData.isActive,
      });
      level = await levelRepo.save(level);
      console.log(`[+] Created Level ${level.levelNumber}: ${level.title}`);
    } else {
      level.title = levelData.title;
      level.targetDescription = levelData.targetDescription;
      level.isActive = levelData.isActive;
      level = await levelRepo.save(level);
      console.log(`[*] Updated Level ${level.levelNumber}: ${level.title}`);
    }
    levelsSeeded++;

    for (const gameData of levelData.games) {
      let game = await gameRepo.findOne({ where: { key: gameData.key } });
      if (!game) {
        game = gameRepo.create({
          levelId: level.id,
          key: gameData.key,
          name: gameData.name,
          orderIndex: gameData.orderIndex,
          pointsReward: gameData.pointsReward,
          successMessage: gameData.successMessage,
          haveNextLevel: gameData.haveNextLevel,
          isPublished: true,
        });
        game = await gameRepo.save(game);
        console.log(`  [+] Created Game: ${game.name} (${game.key})`);
      } else {
        game.levelId = level.id;
        game.name = gameData.name;
        game.orderIndex = gameData.orderIndex;
        game.pointsReward = gameData.pointsReward;
        game.successMessage = gameData.successMessage;
        game.haveNextLevel = gameData.haveNextLevel;
        game.isPublished = true;
        game = await gameRepo.save(game);
        console.log(`  [*] Updated Game: ${game.name} (${game.key})`);
      }
      gamesSeeded++;

      for (const stepData of gameData.steps) {
        let step = await stepRepo.findOne({
          where: { gameId: game.id, stepOrder: stepData.stepOrder },
        });
        if (!step) {
          step = stepRepo.create({
            gameId: game.id,
            stepOrder: stepData.stepOrder,
            layout: stepData.layout,
            title: stepData.title,
            description: stepData.description,
            descriptionExtra: (stepData as any).descriptionExtra || null,
            instruction: stepData.instruction || null,
            videoUrl: (stepData as any).videoUrl || null,
            videoSource:
              (stepData as any).videoSource ||
              (stepData.layout === 'post-with-video' ? 'youtube' : null),
            thumbnailUrl: (stepData as any).thumbnailUrl || null,
            reflectiveTitle: (stepData as any).reflectiveTitle || null,
            reflectiveQuestion: (stepData as any).reflectiveQuestion || null,
          });
        } else {
          step.layout = stepData.layout;
          step.title = stepData.title;
          step.description = stepData.description;
          step.descriptionExtra = (stepData as any).descriptionExtra || null;
          step.instruction = stepData.instruction || null;
          step.videoUrl = (stepData as any).videoUrl || null;
          step.videoSource =
            (stepData as any).videoSource ||
            (stepData.layout === 'post-with-video' ? 'youtube' : null);
          step.thumbnailUrl = (stepData as any).thumbnailUrl || null;
          step.reflectiveTitle = (stepData as any).reflectiveTitle || null;
          step.reflectiveQuestion = (stepData as any).reflectiveQuestion || null;
        }
        await stepRepo.save(step);
        stepsSeeded++;
      }
    }
  }

  console.log(
    `\n[Done] Successfully synced ${levelsSeeded} levels, ${gamesSeeded} games, and ${stepsSeeded} steps.`,
  );
}

