import { useState } from "react";
import { PlayerCard } from "@Components/atomos/index.ts";
import { Baner, ControlMusic } from "@Components/moleculas/index.ts";
import { CardPresentacionAlbun } from "../../moleculas/index";
import ListaReproduccion from "@Components/moleculas/PlayerControl/ListaReproduccion";

export default function CardMusig() {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  return (
    <PlayerCard>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <Baner />

        {/* Sección de presentación del álbum + lista de reproducción en fila */}

        <div className="flex flex-row gap-4 w-full h-[300px]">
          {/* Álbum */}
          <div className="w-1/2">
            <CardPresentacionAlbun analyser={analyser} />
          </div>

          {/* Lista de reproducción */}
          <div className="w-1/2">
            <ListaReproduccion />
          </div>
        </div>


        {/* Controles de música */}
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
