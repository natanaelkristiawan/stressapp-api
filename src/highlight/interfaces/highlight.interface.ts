// interface for highlight (v1)
export interface Highlight {
    id: number;
    name: string;
    image: string;
    order: number;
    link: string;
}

// interface for highlight (v2)
export interface HighlightV2 {
    id: number;
    name: string;
    file: string;
    type: 'image' | 'lottie';
    order: number;
    link: string;
    need_token?: number;
}