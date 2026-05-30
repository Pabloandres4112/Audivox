import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {songs} from '../services/mockData';
import {Song} from '../types/music';

type Profile={name:string;email?:string;isGuest:boolean};
interface AppState {
  onboardingDone:boolean; profile?:Profile; likedIds:string[]; downloadedIds:string[]; recentIds:string[];
  completeOnboarding:()=>void; login:(p:Profile)=>void; logout:()=>void;
  toggleLike:(id:string)=>void; toggleDownload:(id:string)=>void; markRecent:(id:string)=>void; likedSongs:()=>Song[];
}
export const useAppStore=create<AppState>()(persist((set,get)=>({
  onboardingDone:false,likedIds:[],downloadedIds:[],recentIds:[],
  completeOnboarding:()=>set({onboardingDone:true}), login:profile=>set({profile}), logout:()=>set({profile:undefined}),
  toggleLike:id=>set(s=>({likedIds:s.likedIds.includes(id)?s.likedIds.filter(x=>x!==id):[id,...s.likedIds]})),
  toggleDownload:id=>set(s=>({downloadedIds:s.downloadedIds.includes(id)?s.downloadedIds.filter(x=>x!==id):[id,...s.downloadedIds]})),
  markRecent:id=>set(s=>({recentIds:[id,...s.recentIds.filter(x=>x!==id)].slice(0,20)})),
  likedSongs:()=>songs.filter(s=>get().likedIds.includes(s.id)),
}),{name:'audivox-state',storage:createJSONStorage(()=>AsyncStorage),partialize:s=>({onboardingDone:s.onboardingDone,profile:s.profile,likedIds:s.likedIds,downloadedIds:s.downloadedIds,recentIds:s.recentIds})}));
