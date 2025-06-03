
interface Cancion {
  titulo: string;
  artista: string;
  imagen: string;
  sonando?: boolean;
}

const canciones: Cancion[] = [
  {
    titulo: "Eres para Mí (with Anita Tijoux)",
    artista: "Julieta Venegas, Ana Tijoux",
    imagen: "/covers/eres_para_mi.jpg",
    sonando: true,
  },
  {
    titulo: "La flaca",
    artista: "Jarabe De Palo",
    imagen: "/covers/la_flaca.jpg",
  },
  {
    titulo: "Mientes",
    artista: "Camila",
    imagen: "/covers/mientes.jpg",
  },
  {
    titulo: "No Hay Nadie Más",
    artista: "Sebastián Yatra",
    imagen: "/covers/nadie_mas.jpg",
  },
  {
    titulo: "Enamorado Tuyo",
    artista: "El Cuarteto De Nos",
    imagen: "/covers/enamorado_tuyo.jpg",
  },
  {
    titulo: "Andar Conmigo",
    artista: "Julieta Venegas",
    imagen: "/covers/andar_conmigo.jpg",
  },
];

export default function ListaReproduccion() {
  return (
    <div className="bg-black text-white rounded-lg p-4 w-full h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-2">Cola</h2>

      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Sonando</h3>
        {canciones
          .filter((c) => c.sonando)
          .map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <img src={c.imagen} className="w-12 h-12 rounded-md object-cover" />
              <div>
                <p className="text-green-400 font-semibold text-sm">{c.titulo}</p>
                <p className="text-xs text-gray-400">{c.artista}</p>
              </div>
            </div>
          ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">A continuación</h3>
        <div className="flex flex-col gap-3">
          {canciones
            .filter((c) => !c.sonando)
            .map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <img src={c.imagen} className="w-12 h-12 rounded-md object-cover" />
                <div>
                  <p className="text-sm">{c.titulo}</p>
                  <p className="text-xs text-gray-400">{c.artista}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
