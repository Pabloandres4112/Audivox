export interface Artist { id: string; name: string; image: string; monthlyListeners: number; }
export interface Album { id: string; title: string; artistId: string; year: number; cover: string; }
export interface Song { id: string; title: string; artistId: string; albumId: string; duration: number; artwork: string; streamUrl: string; }
export interface Playlist { id: string; title: string; description: string; cover: string; songIds: string[]; }
