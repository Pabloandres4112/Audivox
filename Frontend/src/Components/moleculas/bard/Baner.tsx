import { ColorPalette } from "../../atomos/Colors/colro";
import { HeartIcon } from "../../atomos/Icon/corazon";
import { Title } from "../../atomos/Tittle/Titel";


export default function Baner() {
    return (


        <div className="flex items-center " style={{backgroundColor: ColorPalette.background, border: `2px solid ${ColorPalette.primary}`,}}>
            <Title
                children="Hello World"
            />
            <HeartIcon />
        </div>


    )
}
