import gustarme from './Gustarme_tanto.jpg'

export default function ImagenReproductor() {
  return (
    <>
       
            <img
            src={gustarme}
            alt="Imagen de la canción"
            className="w-full h-full object-cover rounded-lg shadow-lg"
            />
      
      
    </>
  )
}
