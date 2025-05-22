//import { ColorPalette } from "../../atomos/Colors/colro";
import { HeartIcon } from "@Components/atomos/index.ts";
import {IconThem} from "@Components/atomos/index.ts";
//import { ColorPalette } from "../../atomos/Colors/colro";
//import PlayerCard from "../../atomos/ModelCard/PlayerCard";
import { Text } from "@Components/atomos/index.ts";
//import { Title } from "../../atomos/Tittle/Titel";


export default function Baner() {
  return (
    <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-2 gap-4">
      <div className="flex gap-4 items-center">
        <HeartIcon />
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
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

      <div className="flex gap-4 items-center">
        <IconThem />
      </div>
    </div>
  );
}

