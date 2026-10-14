
// dto for job
export class JobDto {
  type: string;
  send_to: number[];
  actor_name: string;
  post_id?: number;
  comment_id?:number;
  space_name?: string;
  title?: string;
  message?: string;
  post_category?: string;
  mimate_id?:number;
}


