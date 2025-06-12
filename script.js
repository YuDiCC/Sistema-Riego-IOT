const urlLambda = 'https://h3w5krtcztgvcixivg6m5mp7ym0quwhz.lambda-url.us-east-2.on.aws/';

async function actualizarTabla() {
  document.getElementById('resumen').textContent = 'Actualizando...';
  document.getElementById('tabla').textContent = 'Cargando...';
  document.getElementById('analisis').textContent = '';

  try {
    const res = await fetch(urlLambda);
    const data = await res.json();

    if (!Array.isArray(data)) {
      document.getElementById('tabla').textContent = 'Error: datos no válidos.';
      return;
    }

    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Lectura más reciente

    // Formateo de la fecha y hora
    const ultimaLectura = data[0];
    const horaUltima = new Date(ultimaLectura.timestamp).getHours();
    const minutosUltima = new Date(ultimaLectura.timestamp).getMinutes();
    const segundosUltima = new Date(ultimaLectura.timestamp).getSeconds();
    const amPm = horaUltima >= 12 ? 'PM' : 'AM';
    const fechaUltima = new Date(ultimaLectura.timestamp).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
    const diaSemana = new Date(ultimaLectura.timestamp).toLocaleDateString('es-ES', { weekday: 'long' });
    const diaUltima = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);


    // Datos de la última lectura de Sensores
    const tempUltima = ultimaLectura.lm35.toFixed(2);
    const dhtHumUltima = ultimaLectura.dht_hum.toFixed(2);
    const luzUltima = ultimaLectura.luz.toFixed(2);
    const humedadSueloUltima = ultimaLectura.humedad_suelo.toFixed(2);
    const estadoBomba = ultimaLectura.bomba;


    //Resumen
    const total = data.length;

    document.getElementById('resumen').innerHTML =
      `<div>
          <h2>Últimos Indicadores Registrados</h2>
          <img src="img/indicador.webp" style="width: 70px;">

          <div class="datos-actuales">
            <div>
              <p class="time-text"><span>${horaUltima}:${minutosUltima}:${segundosUltima}</span><span class="time-sub-text">${amPm}</span></p>
              <p class="day-text">${diaUltima}, ${fechaUltima}</p>
            </div>
            <div>Total de registros 
              <img src="img/data1.webp" style="width: 50px;">
              <p>${total} registros</p>
            </div>
            <div>Temperatura 
              <img src="img/termometro.webp" style="width: 40px;">
              <p>${tempUltima} °C</p>
            </div>
            <div>Humedad del Aire 
              <img src="img/humedad.webp" style="width: 40px;">
              <p>${dhtHumUltima} %</p>
            </div>
            <div>Iluminancia 
              <img src="img/${luzUltima >= 50 ? 'sol.webp' : 'luna.webp'}" style="width: 60px;">
              <p>${luzUltima} %</p>
            </div>
            <div>Humedad del Suelo 
              <img src="img/humedad-suelo.webp" style="width: 60px;">
              <p>${humedadSueloUltima} %</p>
            </div>
            <div>Estado de la Bomba 
              <img src="img/${estadoBomba ? 'on.webp' : 'off.webp'}" style="width: 70px;">
              <p>${estadoBomba ? 'Encendida' : 'Apagada'}</p>
            </div>
          </div>
        </div>`;

    //Tabla

    const ultimos10 = data.slice(0, 10);
    let tabla = `<table><thead><tr>
                      <th>Fecha</th>
                      <th>Temperatura</th>
                      <th>Humedad Aire</th>
                      <th>Iluminancia</th>
                      <th>Humedad Suelo</th>
                      <th>Bomba</th>
                    </tr></thead><tbody>`;

    ultimos10.forEach(r => {
      tabla += `<tr>
                      <td>${new Date(r.timestamp).toLocaleString()}</td>
                      <td>${r.lm35} °C</td>
                      <td>${r.dht_hum} %</td>
                      <td>${r.luz} %</td>
                      <td>${r.humedad_suelo} %</td>
                      <td>${r.bomba ? 'Encendido' : 'Apagado'}</td>
                    </tr>`;
    });

    tabla += `</tbody></table>`;
    document.getElementById('tabla').innerHTML = tabla;

    realizarAnalisis(data);

  } catch (error) {
    console.error('Error al obtener datos:', error);
    document.getElementById('tabla').textContent = 'No se pudieron cargar los datos.';
    document.getElementById('resumen').textContent = 'Error al actualizar.';
  }
}


actualizarTabla();