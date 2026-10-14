export class NotifDto {
  user_id: number[];
  title: string;
  short_description: string;
  image?: string;
  deeplink?: string;
  push_notification?: boolean;
  group?:string;
}