import React from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppStore} from '../../store/useAppStore';
import {theme} from '../../theme';
import {Song} from '../../types/music';
import {formatTime} from '../../utils/time';
export const SongCard=({song,artist,onPress}:{song:Song;artist:string;onPress:()=>void})=>{
  const {likedIds,toggleLike}=useAppStore(); const liked=likedIds.includes(song.id);
  return <Pressable style={styles.card} onPress={onPress}><Image source={{uri:song.artwork}} style={styles.cover}/><View style={styles.meta}><Text style={styles.title} numberOfLines={1}>{song.title}</Text><Text style={styles.artist}>{artist}</Text></View><Text style={styles.time}>{formatTime(song.duration)}</Text><Pressable onPress={()=>toggleLike(song.id)}><Icon name={liked?'heart':'heart-outline'} size={20} color={liked?theme.colors.danger:theme.colors.textMuted}/></Pressable></Pressable>;
};
const styles=StyleSheet.create({card:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:theme.colors.surface,borderWidth:1,borderColor:theme.colors.border,borderRadius:16,padding:12},cover:{width:50,height:50,borderRadius:10},meta:{flex:1},title:{color:theme.colors.text,fontWeight:'700'},artist:{color:theme.colors.textMuted,fontSize:12},time:{color:theme.colors.textMuted,fontSize:12}});
