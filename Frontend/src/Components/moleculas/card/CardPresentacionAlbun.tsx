import ImagenReproductor from "../../atomos/Img/ImagenReproductor";
import { Text } from "../../atomos/Tittle/Text";
// import { Title } from "../../atomos/Tittle/Titel";
import { Title } from '@Components/atomos/index.ts';


export default function CardPresentacionAlbun() {
  return (
    <div className="flex flex-col md:flex-row items-center gap-6 text-white rounded-2xl p-4 w-full">
      <div className="w-full md:w-1/2 object-cover shadow-lg rounded-xl flex justify-center">
        <ImagenReproductor />
      </div>

      <div className="flex flex-col items-center md:items-start text-center md:text-left justify-center w-full md:w-1/2">
        <Title
          className="text-white tracking-wide text-3xl md:text-5xl"
          style={{ fontFamily: "sans-serif" }}
        >
          Bohemian Rhapsody
        </Title>
        <Text
          className="text-gray-400 hover:text-white transition mt-2 text-base md:text-lg"
          style={{ fontFamily: "sans-serif" }}
        >
          Nombre de la canción
        </Text>
      </div>
    </div>
  );
}

