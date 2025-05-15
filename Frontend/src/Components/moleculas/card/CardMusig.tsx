import {PlayerCard} from "@Components/atomos/index.ts";
import Baner from "@Components/moleculas/bard/Baner";
import CardPresentacionAlbun from "./CardPresentacionAlbun";
import ControlMusic from "@Components/organismos/controlMusic";


export default function CardMusig() {
  return (
    <>
    <PlayerCard>
        <Baner/>
        {/* aqui va la imagen de la cancion */}
        <CardPresentacionAlbun/>
        {/* Funcionalidad de el reproductor */}
        <ControlMusic/>

    </PlayerCard>
    </>
  )
}
