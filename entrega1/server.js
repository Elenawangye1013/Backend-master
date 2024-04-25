// Importación de módulos
const http = require('http');
const fs = require('fs');


// Crear el servidor HTTP
const server = http.createServer((req, res) => {
    // si recibimos el metodo GET
  if (req.method === 'GET') {
    // Obtener la ruta que se introduce y coger el ID o el pokemon
    const path = req.url.toLowerCase();
    const parts = path.split('/');
    const pokemonIdentifier = decodeURIComponent(parts[parts.length - 1]); // Decodificar el nombre del pokemon quitándole la barra que añadimos

    // condición para el caso de que solo escribiéramos una barra sin introducir nombre de pokemon
    if (path === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' }); // se especifica el tipo de contenido que se introduce si la llamada da un 200 que esta correcta
        res.end('Escribe en la ruta el pokemon que quieras buscar.');
        return;
      }
    // buscamos el pokemon introducido en nuestra bbdd en el archivo pokedex.json
    fs.readFile('pokedex.json', 'utf8', (err, data) => {
      if (err) { // en el caso que de error al leer el archivo de pokedex nos devolverá Error interno 
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error interno del servidor');
        return;
      }

      let pokemonData; // declara variable
      try {
        pokemonData = JSON.parse(data); //pasamos los datos en un objeto de js
      } catch (error) { // con esta funcion controlamos el error que nos da si falla
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error al analizar los datos');
        return;
      }

      // aquí se declara una variable pokemos y se busca con que dato coincide el que introducimos
      const pokemon = pokemonData.find(pokemon => {
        const idMatch = pokemon.id.toString() === pokemonIdentifier;
        const englishNameMatch = typeof pokemon.name === 'object' && pokemon.name.english.toLowerCase() === pokemonIdentifier;  //tolowercase se usa para pasar pasar todos los caracteres a minusculas
        const japaneseNameMatch = typeof pokemon.name === 'object' && pokemon.name.japanese === pokemonIdentifier;
        const chineseNameMatch = typeof pokemon.name === 'object' && pokemon.name.chinese === pokemonIdentifier;
        const frenchNameMatch = typeof pokemon.name === 'object' && pokemon.name.french.toLowerCase() === pokemonIdentifier;
        return idMatch || englishNameMatch || japaneseNameMatch || chineseNameMatch || frenchNameMatch; // devolvemos con el que haya coincidido
      });

      // en el caso de que haya encontrado el valor en pokedex.json, entonces pokemon tiene valor
      if (pokemon) {
        // se declara una variable y se introduce cada dato. Por ejemplo: pokemon.base.Attack -> busca en la bbdd el valor de Attack
        const response = `Tipo: [${pokemon.type.join(', ')}]\nHP: ${pokemon.base.HP}\nAttack: ${pokemon.base.Attack}\nDefense: ${pokemon.base.Defense}\nSp. Attack: ${pokemon.base['Sp. Attack']}\nSp. Defense: ${pokemon.base['Sp. Defense']}\nSpeed: ${pokemon.base.Speed}`;
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(response);
      } else { // en el caso de que no se encuentre en la bbdd, entonces la varible pokemon no tendrá valor y devolvemos un mensaje
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('El Pokemon no existe en la BBDD');
      }
    });
    // si no recibimos metodo GET
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});


const PORT = 3000; // especifica el puerto por el que se escucha
server.listen(PORT, () => {
  console.log(`Proyecto levantado en http://localhost:${PORT}/`); // esto no es funcional pero me ha servido mucho para verificar cada vez que levanto el proyecto
});
