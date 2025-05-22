import { PlayerCard } from "@Components/atomos/index.ts";
import Baner from "@Components/moleculas/bard/Baner";
import CardPresentacionAlbun from "./CardPresentacionAlbun";
import ControlMusic from "@Components/organismos/controlMusic";

export default function CardMusig() {
  return (
    <PlayerCard>
      <div className="flex flex-col h-full overflow-hidden gap-4">
        <Baner />
        <CardPresentacionAlbun />
        <ControlMusic />
      </div>
    </PlayerCard>
  );
}
