const express = require('express');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
// Este token caduca en 1 hora, hay que actualizarlo
const token = 'BQCG6My2OkMZwPFa8h_oToCrA6pIfnJj38qZ4fcB4ITdeqtld8MWUGl8GSelRYEQxN_H2EgUTrTXT4Vx3tXCkyVsPTLBDkpsD1wSUri_s9oh9DkpgbQ83YXXD0YZu59FC0huDfQsCJDPxVdE4dLeb-M1v1EqLvUPv37UNV2RmbFA5DjxpPs1uaTNoZnTmWejEx_xiOuQQE-qh1-UwGaY7AoE78RNxAZ6NurYeNhim-qg2tH9z0NWdwGd3kNm-Jc';
const url = 'mongodb://localhost:27017';
const dbName = 'bbdd_spotify';

// Estas líneas son de la documentación de api de spotify para obtener el token pero no me ha funcionado
// var client_id = '';
// var client_secret = '';

// var authOptions = {
//     url: 'https://accounts.spotify.com/api/token',
//     headers: {
//       'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
//     },
//     form: {
//       grant_type: 'client_credentials'
//     },
//     json: true
//   };
//   request.post(authOptions, function(error, response, body) {
//     if (!error && response.statusCode === 200) {
//       var token = body.access_token;
//     }
//   });

// Conexión con MongoDB
MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    console.log('Conexión establecida con MongoDB');
    const db = client.db(dbName);

     app.use(express.json());

    // Este POST se utiliza para crear/añadir nuevas canciones en la lista. Los parámetros que  hay que introducir son el nombre del artista y de la cancion
    app.post('/add-track/:nombre/:artista', async (req, res) => {
      try {
        const { nombre, artista } = req.params;
        
        // Busca la canción en Spotify
        const spotifyResponse = await axios.get('https://api.spotify.com/v1/search', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            q: `${nombre} ${artista}`,
            type: 'track',
          },
        });

        // Verificar si la canción existe en Spotify
        const tracks = spotifyResponse.data.tracks.items;
        if (tracks.length === 0) {
          return res.status(404).json({ error: 'La canción no existe en Spotify' });
        }

        // Comparar los datos de la canción de Spotify con los datos de la solicitud
        const track = tracks.find(track => track.name === nombre && track.artists[0].name === artista);
        if (!track) {
          return res.status(404).json({ error: 'La canción no existe en Spotify, revisa si está bien escrito. Ten en cuenta las mayúsculas, minúsculas y si tiene espaciodos habría que poner un %20' });
        }
         // URL de Spotify de la canción si existe
         const spotifyUrl = tracks[0].external_urls.spotify;

        // Verificar si la canción ya existe en nuestra base de datos
        const collection = db.collection('canciones');
        const existingSong = await collection.findOne({ nombre, artista });
        if (existingSong) {
          return res.status(400).json({ error: 'La canción ya existe en la base de datos' });
        }

        // Agregar la canción a la base de datos con el nombre de la canción, el artista y la url de spotify de esta canción
        const result = await collection.insertOne({ nombre, artista, spotifyUrl });
        const id = result.insertedId;
        res.json({ success: true, message: 'Canción agregada correctamente', id });
      } catch (error) {
        console.error('Error al agregar la canción:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    });

    //Este DELETE se utiliza para eliminar canciones de la base de datos. Los parámetros que hay que introducir son el nombre de la canción y del artista
    app.delete('/delete-track/:nombre/:artista', async (req, res) => {
        try {
          const { nombre, artista } = req.params;
          const collection = db.collection('canciones');
      
          // Verificar si la canción existe en la base de datos
          const existingSong = await collection.findOne({ nombre, artista });
          if (!existingSong) {
            return res.status(404).json({ error: 'La canción no existe en la base de datos' });
          }
      
          // Eliminar la canción de la base de datos
          await collection.deleteOne({ nombre, artista });
      
          // Envía una respuesta si se ha podido eliminar o ha dado error
          res.json({ success: true, message: 'Canción eliminada correctamente' });
        } catch (error) {
          console.error('Error al eliminar la canción:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // ESte PUT se utiliza para actulizar/añadir nuevos datos a una canción. En este caso se usa para añadir el dato de la duracion de una cancion
    app.put('/update-duration/:nombre/:artista', async (req, res) => {
        try {
          const { nombre, artista } = req.params;
          // Busca con la api de apotify la url
          const spotifyResponse = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              q: `${nombre} ${artista}`,
              type: 'track',
              limit: 1, // Limita la búsqueda a una sola canción
            },
          });
      
          // Verifica si existe la cancion de spotify
          if (spotifyResponse.data.tracks.items.length === 0) {
            return res.status(404).json({ error: 'La canción no fue encontrada en Spotify' });
          }
      
          // Obtiene la duración de la primera canción encontrada
          const duracion = spotifyResponse.data.tracks.items[0].duration_ms;
      
          // Convierte la duración a minutos
          const duracionMinutos = duracion / 60000;
      
          // Actualiza la duración de la canción en la base de datos
          const collection = db.collection('canciones');
          const result = await collection.updateOne(
            { nombre, artista },
            { $set: { duracion: duracionMinutos } }
          );
          // Si no encuentra en la base de datos la cancion que estamos actualizando
          if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'No se encontró la canción para actualizar' });
          }
      
          res.json({ success: true, message: 'Duración de la canción actualizada correctamente' });
        } catch (error) {
          console.error('Error al actualizar la duración de la canción:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      });
    
      // ESte PUT se utiliza para actulizar/añadir nuevos datos a una canción. En este caso se usa para añadir el dato del album al que pertenece una cancion

      app.put('/update-album/:nombre/:artista', async (req, res) => {
        try {
            // Repetimos los mismos pasos del put anterior
            const { nombre, artista } = req.params;
            const spotifyResponse = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              q: `${nombre} ${artista}`,
              type: 'track',
              limit: 1, 
            },
          });
  
          if (spotifyResponse.data.tracks.items.length === 0) {
            return res.status(404).json({ error: 'La canción no fue encontrada en Spotify' });
          }
            const album = spotifyResponse.data.tracks.items[0].album.name;
  
          const collection = db.collection('canciones');
  
          // Actualizar el álbum de la canción en la base de datos
          const result = await collection.updateOne(
            { nombre, artista },
            { $set: { album } }
          );
  
          if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'No se encontró la canción para actualizar' });
          }
  
          res.json({ success: true, message: 'Álbum de la canción actualizado correctamente' });
        } catch (error) {
          console.error('Error al actualizar el álbum de la canción:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      });

      // Este GET se utiliza para obtener datos, en este caso los datos que nos va a mostrar son las canciones que hemos añadido a la base de datos
      app.get('/canciones', async (req, res) => {
        try {
          // Conectar a la colección de canciones
          const collection = db.collection('canciones');
          
          // Obtener todos los datos de la colección
          const canciones = await collection.find({}).toArray();
      
          // Devuelve los datos como respuesta
          res.json(canciones);
        } catch (error) {
          console.error('Error al obtener las canciones:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
        }
      });

    
  })
  .catch(err => console.error('Error al conectar a MongoDB:', err));


// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
