import ImagenReproductor from "../../atomos/Img/ImagenReproductor";
import { Text } from "../../atomos/Tittle/Text";
// import { Title } from "../../atomos/Tittle/Titel";
import { Title } from '@Components/atomos/index.ts';


export default function CardPresentacionAlbun() {
  return (
    <div className="flex items-center gap-6  text-white rounded-2xl p-6">
      <div className="w-1/2 h-1/2 object-cover shadow-lg rounded-4xl flex items-center justify-start mt-10">
        <ImagenReproductor />
      </div>

      <div className="flex flex-col items-start justify-center">
        <Title
          className="text-white tracking-wide"
          style={{ fontFamily: "sans-serif", fontSize: "50px" }}
        >
          Bohemian Rhapsody
        </Title>

        <Text
          className="text-gray-400 hover:text-white transition mt-2"
          style={{ fontFamily: "sans-serif", fontSize: "20px" }}
        >
          Nombre de la canción
        </Text>
      </div>
    </div>
  );
}
