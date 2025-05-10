//import { ColorPalette } from "../../atomos/Colors/colro";
import { HeartIcon } from "../../atomos/Icon/corazon";
import IconThem from "../../atomos/Icon/IconThem";
import PlayerCard from "../../atomos/ModelCard/PlayerCard";
import { Text } from "../../atomos/Tittle/Text";
//import { Title } from "../../atomos/Tittle/Titel";


export default function Baner() {
    return (

        <>
            <PlayerCard>
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    
                    <div className="flex gap-4 items-center">
                        <HeartIcon />
                    </div>
                    {/* Navegación */}
                    <div className="flex gap-6">
                        <Text>
                            <span className="text-white font-semibold">Browse</span>
                        </Text>
                        <Text>
                            <span className="text-gray-400 hover:text-white transition">Library</span>
                        </Text>
                        <Text>
                            <span className="text-gray-400 hover:text-white transition">Radio</span>
                        </Text>
                    </div>

                    {/* Iconos (opcional agregar spacing) */}
                    <div className="flex gap-4 items-center">
                       
                        <IconThem />
                    </div>
                </div>
            </PlayerCard>
        </>

    )
}
