import { useState } from "react";
import { PlayerCard } from "@Components/atomos/index.ts";
import Baner from "@Components/moleculas/bard/Baner";
import CardPresentacionAlbun from "./CardPresentacionAlbun";
import ControlMusic from "@Components/organismos/controlMusic";

export default function CardMusig() {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  return (
    <PlayerCard>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <Baner />
        <CardPresentacionAlbun analyser={analyser} />
        <ControlMusic
          setAnalyser={setAnalyser}
          setAudioContext={setAudioContext}
          analyser={analyser}
          audioContext={audioContext}
        />
      </div>
    </PlayerCard>
  );
}
