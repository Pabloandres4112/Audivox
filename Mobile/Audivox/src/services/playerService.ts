import {Song} from '../types/music';
class PlayerService { async play(_song: Song){return true;} async pause(){return true;} }
export const playerService = new PlayerService();
