export const VIOLATION_TYPES = [
  'self_harm',
  'sexual',
  'sara',
  'bullying',
] as const;
export const MODERATION_TYPES = [
  ...VIOLATION_TYPES,
  'safe',
  'uncertain',
] as const;
export type ViolationType = (typeof VIOLATION_TYPES)[number];
export type ModerationType = (typeof MODERATION_TYPES)[number];

const communityMessage =
  'Maaf, pesanmu mengandung kata-kata yang tidak sesuai dengan Panduan Komunitas TemuSOBAT. Mari kita jaga ruang diskusi ini agar tetap hangat, aman, dan saling menghargai satu sama lain. Pesanmu tidak kami tampilkan untuk menjaga ruang aman bersama.';
export const DEFAULT_MESSAGES: Record<ViolationType, string> = {
  sara: communityMessage,
  sexual: communityMessage,
  self_harm:
    'Perasaan lelah, cemas, atau kewalahan yang kamu rasakan saat ini sangat valid, dan kamu tidak harus menanggungnya sendirian. Pesanmu tidak kami tampilkan untuk menjaga ruang aman bersama. Jika kamu membutuhkan dukungan, hubungi orang yang kamu percaya atau layanan bantuan profesional setempat.',
  bullying:
    'Pesanmu mengandung istilah yang mungkin bisa membuat teman-teman lain merasa kurang nyaman. Mohon agar dapat menyesuaikan bahasanya untuk membuat suasana guyub dan kebersamaan tetap terjaga.',
};

/** Maps retained legacy metadata into the confirmed priority; new AI responses use one type directly. */
export function violationType(result: {
  type?: string;
  categories?: string[];
}): ViolationType | null {
  const categories = result.type ? [result.type] : result.categories ?? [];
  if (categories.includes('self_harm')) {
    return 'self_harm';
  }
  if (categories.some((type) => ['sexual', 'pornography'].includes(type))) {
    return 'sexual';
  }
  if (categories.includes('sara')) {
    return 'sara';
  }
  if (
    categories.some((type) =>
      ['bullying', 'harassment', 'profanity', 'threat'].includes(type),
    )
  ) {
    return 'bullying';
  }
  return null;
}
