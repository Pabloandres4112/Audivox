import React from 'react'; import {StyleSheet,Text,View} from 'react-native'; import {theme} from '../../theme';
export const EmptyBlock=({title,subtitle}:{title:string;subtitle:string})=><View style={styles.box}><Text style={styles.title}>{title}</Text><Text style={styles.sub}>{subtitle}</Text></View>;
export const SkeletonBlock=()=><View style={[styles.box,{height:96}]}><Text style={styles.sub}>Loading…</Text></View>;
const styles=StyleSheet.create({box:{backgroundColor:theme.colors.surface,borderRadius:16,borderWidth:1,borderColor:theme.colors.border,padding:16,gap:6},title:{color:theme.colors.text,fontWeight:'700'},sub:{color:theme.colors.textMuted}});
