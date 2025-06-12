function realizarAnalisis(data) {
  const analisis = [];
  const porHora = {};
  const porPunto = {};
  const bombaPorDia = {};
  const alertas = [];
  const estresPorHora = {}; // temperatura > 40 o humedad < 40

  data.forEach(d => {
    const fecha = new Date(d.timestamp);
    const hora = fecha.getHours();
    const dia = fecha.toISOString().slice(0, 10);
    const punto = d.punto || "Sin punto";

    if (!porHora[hora]) porHora[hora] = [];
    porHora[hora].push(d);

    if (!porPunto[punto]) porPunto[punto] = [];
    porPunto[punto].push(d);

    if (!bombaPorDia[dia]) bombaPorDia[dia] = 0;
    if (d.bomba) bombaPorDia[dia]++;

    // Alertas
    if (d.lm35 > 40) {
      alertas.push(`⚠️ Alta temperatura (${d.lm35} °C) en punto ${punto} a las ${fecha.toLocaleString()}`);
    }
    if (d.humedad_suelo < 40) {
      alertas.push(`⚠️ Baja humedad del suelo (${d.humedad_suelo}%) en punto ${punto} a las ${fecha.toLocaleString()}`);
    }

    // Estrés por hora
    if (!estresPorHora[hora]) estresPorHora[hora] = 0;
    if (d.lm35 > 40 || d.humedad_suelo < 40) estresPorHora[hora]++;
  });

  const media = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const desviacion = arr => {
    const m = media(arr);
    return Math.sqrt(media(arr.map(x => (x - m) ** 2)));
  };

  analisis.push(`<h3>📊 Análisis de Datos</h3>`);

  // 🔔 Alertas
  if (alertas.length > 0) {
    analisis.push(`<p><i>🚨 Alertas críticas:</i></p><ul>`);
    alertas.forEach(a => analisis.push(`<li>${a}</li>`));
    analisis.push(`</ul>`);
  } else {
    analisis.push(`<p>✅ No se detectaron valores críticos.</p>`);
  }



  // 📌 Por punto
  analisis.push(`<p><i>Promedios por punto:</i></p>`);
  analisis.push(`<table class="media-puntos">
    <thead>
      <tr>
        <th>Punto</th>
        <th>Temperatura (°C)</th>
        <th>Iluminancia (%)</th>
        <th>Hum. Aire (%)</th>
        <th>Hum. Suelo (%)</th>
      </tr>
    </thead>
    <tbody>`);
  for (let p in porPunto) {
    const tempLM = porPunto[p].map(d => d.lm35);
    const humDHT = porPunto[p].map(d => d.dht_hum);
    const luz = porPunto[p].map(d => d.luz);
    const humSuelo = porPunto[p].map(d => d.humedad_suelo);

    analisis.push(`<tr>
      <td><strong>${p}</strong></td>
      <td>${media(tempLM).toFixed(2)}</td>
      <td>${media(luz).toFixed(2)}</td>
      <td>${media(humDHT).toFixed(2)}</td>
      <td>${media(humSuelo).toFixed(2)}</td>
    </tr>`);
  }
  analisis.push(`</tbody></table>`);

  // 💦 Historial de riego
  analisis.push(`<p><i>💦 Historial de activaciones de bomba por día:</i></p><ul>`);
  for (let d in bombaPorDia) {
    const riegos = bombaPorDia[d];
    const estado = riegos > 3 ? "⚠️ Posible sobre-riego" : "✅ OK";
    analisis.push(`<li>${d}: ${riegos} activaciones (${estado})</li>`);
  }
  analisis.push(`</ul>`);

  // 📅 Mapeo de estrés por hora
  analisis.push(`<p><i>📅 Horas del día con más estrés (alta temp o baja humedad):</i></p><ul>`);
  const horasEstres = Object.entries(estresPorHora).sort((a, b) => b[1] - a[1]);
  horasEstres.forEach(([hora, cantidad]) => {
    const alerta = cantidad > 2 ? "⚠️" : "✅";
    analisis.push(`<li>${hora}:00 → ${cantidad} lecturas críticas ${alerta}</li>`);
  });
  analisis.push(`</ul>`);

  // 🌱 Punto más seco y con más luz
  const puntoMasSeco = Object.entries(porPunto).reduce((a, b) => {
    const promA = media(a[1].map(d => d.humedad_suelo));
    const promB = media(b[1].map(d => d.humedad_suelo));
    return promA < promB ? a : b;
  });

  const puntoMasLuz = Object.entries(porPunto).reduce((a, b) => {
    const luzA = media(a[1].map(d => d.luz));
    const luzB = media(b[1].map(d => d.luz));
    return luzA > luzB ? a : b;
  });

  analisis.push(`<p><i>💧 El punto que requiere más riego es:</i> <strong>${puntoMasSeco[0]}</strong></p>`);
  analisis.push(`<p><i>☀️ El punto con mayor exposición solar es:</i> <strong>${puntoMasLuz[0]}</strong></p>`);
  

  // 📝 Recomendaciones

  const recomendaciones = [];

  // Recomendaciones basadas en alertas
  if (alertas.length > 0) {
    if (alertas.some(a => a.includes('Alta temperatura'))) {
      recomendaciones.push('Revisar la ventilación y sombra en los puntos con alta temperatura.');
    }
    if (alertas.some(a => a.includes('Baja humedad'))) {
      recomendaciones.push('Aumentar la frecuencia de riego en los puntos con baja humedad del suelo.');
    }
  } else {
    recomendaciones.push('Las condiciones actuales son óptimas. Mantener el monitoreo regular.');
  }

  // Sobre-riego
  const sobreRiego = Object.values(bombaPorDia).some(r => r > 3);
  if (sobreRiego) {
    recomendaciones.push('Verificar posibles fugas o programación de riego excesiva.');
  }

  // Estrés por hora
  if (horasEstres.length > 0 && horasEstres[0][1] > 2) {
    recomendaciones.push('Considerar ajustar el horario de riego para reducir el estrés en las horas críticas.');
  }

  // Punto más seco
  recomendaciones.push(`Priorizar el riego en el punto <strong>${puntoMasSeco[0]}</strong>, ya que presenta menor humedad del suelo.`);

  // Punto con más luz
  recomendaciones.push(`Evaluar la protección solar en el punto <strong>${puntoMasLuz[0]}</strong> para evitar estrés hídrico por alta exposición.`);

  // Variabilidad de sensores
  for (let p in porPunto) {
    const humSueloArr = porPunto[p].map(d => d.humedad_suelo);
    if (desviacion(humSueloArr) > 10) {
      recomendaciones.push(`La humedad del suelo en el punto <strong>${p}</strong> es muy variable. Revisar uniformidad del riego.`);
    }
    const tempArr = porPunto[p].map(d => d.lm35);
    if (desviacion(tempArr) > 5) {
      recomendaciones.push(`La temperatura en el punto <strong>${p}</strong> muestra fluctuaciones significativas. Verificar condiciones ambientales.`);
    }
  }

  // Recomendación si hay pocos datos
  if (data.length < 20) {
    recomendaciones.push('Se recomienda recolectar más datos para obtener un análisis más confiable.');
  }

  // Genera el HTML de recomendaciones
  let recomendacionesHTML = `<div><h4>📝 Recomendaciones</h4><ul>`;
  recomendaciones.forEach(r => recomendacionesHTML += `<li>${r}</li>`);
  recomendacionesHTML += `</ul>`;

  // También lo deja disponible para otros lugares de la página
  document.getElementById('recomendaciones').innerHTML = recomendacionesHTML;

  document.getElementById('analisis').innerHTML = analisis.join('');


  // GRAFICO 1: Promedio de sensores por fecha
  // Agrupa los datos por fecha (día)
  const porFecha = {};
  data.forEach(d => {
    const fecha = new Date(d.timestamp).toISOString().slice(0, 10);
    if (!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push(d);
  });

  const fechas = Object.keys(porFecha).sort();
  const tempPromFecha = fechas.map(f => media(porFecha[f].map(d => d.lm35)));
  const humSueloPromFecha = fechas.map(f => media(porFecha[f].map(d => d.humedad_suelo)));
  const luzPromFecha = fechas.map(f => media(porFecha[f].map(d => d.luz)));
  const humDHTPromFecha = fechas.map(f => media(porFecha[f].map(d => d.dht_hum)));

  new Chart(document.getElementById('graficoTempHum'), {
    type: 'line',
    data: {
      labels: fechas,
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: tempPromFecha,
          borderColor: 'red',
          fill: false,
        },
        {
          label: 'Iluminancia (%)',
          data: luzPromFecha,
          borderColor: 'orange',
          fill: false,
        },
        {
          label: 'Hum. Suelo (%)',
          data: humSueloPromFecha,
          borderColor: 'blue',
          fill: false,
        },
        {
          label: 'Hum. Aire (%)',
          data: humDHTPromFecha,
          borderColor: 'green',
          fill: false,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: '🌡️ Promedio de Sensores por Fecha' }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // GRAFICO 2: Promedios por punto
  const puntos = Object.keys(porPunto);
  const tempLM35PorPunto = puntos.map(p => media(porPunto[p].map(d => d.lm35)));
  const humDHTPorPunto = puntos.map(p => media(porPunto[p].map(d => d.dht_hum)));
  const luzPorPunto = puntos.map(p => media(porPunto[p].map(d => d.luz)));
  const humSueloPorPunto = puntos.map(p => media(porPunto[p].map(d => d.humedad_suelo)));

  new Chart(document.getElementById('graficoPorPunto'), {
    type: 'bar',
    data: {
      labels: puntos,
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: tempLM35PorPunto,
          backgroundColor: 'rgba(255, 99, 132, 0.6)'
        },
        {
          label: 'Hum. Aire (%)',
          data: humDHTPorPunto,
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        },
        {
          label: 'Iluminancia (%)',
          data: luzPorPunto,
          backgroundColor: 'rgba(255, 159, 64, 0.6)'
        },
        {
          label: 'Hum. Suelo (%)',
          data: humSueloPorPunto,
          backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: '📍 Promedios por Punto de Medición' }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });


  // GRAFICO 3: Historial de riego
  const dias = Object.keys(bombaPorDia).sort();
  const riegos = dias.map(d => bombaPorDia[d]);

  new Chart(document.getElementById('graficoBomba'), {
    type: 'bar',
    data: {
      labels: dias,
      datasets: [{
        label: 'Activaciones de bomba',
        data: riegos,
        backgroundColor: riegos.map(n => n > 3 ? 'orange' : 'green')
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: '💧 Historial de Riego (Activaciones por Día)' }
      }
    }
  });

  // GRAFICO 4: Estrés por hora y día
  // Agrupa las lecturas críticas por día y hora
  const estresPorDiaHora = {};
  data.forEach(d => {
    const fecha = new Date(d.timestamp);
    const dia = fecha.toISOString().slice(0, 10);
    const hora = fecha.getHours();
    if (d.lm35 > 40 || d.humedad_suelo < 40) {
      if (!estresPorDiaHora[dia]) estresPorDiaHora[dia] = {};
      if (!estresPorDiaHora[dia][hora]) estresPorDiaHora[dia][hora] = 0;
      estresPorDiaHora[dia][hora]++;
    }
  });

  // Prepara los datos para el gráfico: solo horas con lecturas críticas
  const diasEstres = Object.keys(estresPorDiaHora).sort();
  const datasets = diasEstres.map((dia, idx) => {
    const horas = Array.from({ length: 24 }, (_, h) => h);
    return {
      label: dia,
      data: horas.map(h => estresPorDiaHora[dia][h] || 0),
      backgroundColor: `hsl(${(idx * 60) % 360}, 70%, 60%)`
    };
  });

  // Solo mostrar horas/días donde hubo lecturas críticas
  // Encuentra las horas donde al menos un día hubo lecturas críticas
  const horasCriticas = [];
  for (let h = 0; h < 24; h++) {
    if (diasEstres.some(dia => estresPorDiaHora[dia][h])) {
      horasCriticas.push(h);
    }
  }

  new Chart(document.getElementById('graficoEstres'), {
    type: 'bar',
    data: {
      labels: horasCriticas.map(h => `${h}:00`),
      datasets: datasets.map(ds => ({
        ...ds,
        data: horasCriticas.map(h => ds.data[h])
      }))
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: '🔥 Horas críticas por día (Temp > 40 °C o Hum < 40%)' },
        legend: { display: true }
      },
      scales: {
        y: { beginAtZero: true },
        x: { title: { display: true, text: 'Hora del día' } }
      }
    }
  });

  // GRAFICO 5: Doughnut chart - Distribución de alertas críticas
  if (alertas.length > 0) {
    // Clasifica alertas por tipo
    const tipos = { 'Alta temperatura': 0, 'Baja humedad': 0 };
    alertas.forEach(a => {
      if (a.includes('Alta temperatura')) tipos['Alta temperatura']++;
      if (a.includes('Baja humedad')) tipos['Baja humedad']++;
    });
    new Chart(document.getElementById('graficoDoughnut'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(tipos),
        datasets: [{
          data: Object.values(tipos),
          backgroundColor: ['#ff6384', '#36a2eb']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: '🚨 Distribución de Alertas Críticas' }
        }
      }
    });
  }

  // GRAFICO 6: Pie chart - Porcentaje de activaciones de bomba por punto
  // Cuenta activaciones de bomba por punto
  const bombaPorPunto = {};
  data.forEach(d => {
    const punto = d.punto || "Sin punto";
    if (!bombaPorPunto[punto]) bombaPorPunto[punto] = 0;
    if (d.bomba) bombaPorPunto[punto]++;
  });
  new Chart(document.getElementById('graficoPie'), {
    type: 'pie',
    data: {
      labels: Object.keys(bombaPorPunto),
      datasets: [{
        data: Object.values(bombaPorPunto),
        backgroundColor: [
          '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: '💦 Activaciones de Bomba por Punto' }
      }
    }
  });

}





