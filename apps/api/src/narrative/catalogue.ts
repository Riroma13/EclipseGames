export type NarrativeTerm = 'T1' | 'T2' | 'T3';
export type MechanicKind = 'CHALLENGE' | 'MINIGAME';
export type MechanicRequirement = 'REQUIRED' | 'OPTIONAL' | 'NONE';

export type NarrativeCatalogueEvent = {
  ordinal: number;
  key: string;
  title: string;
  term: NarrativeTerm;
  finalSceneSummary: string;
  clues: readonly string[];
  mechanic: { requirement: MechanicRequirement; kind: MechanicKind | null };
};

export const narrativeCatalogue = [
  { ordinal: 1, key: 't1_el_apagon', title: 'El apagón', term: 'T1', finalSceneSummary: 'Durante una tarde aparentemente normal, las pantallas del aula se apagan al mismo tiempo que la escuela pierde el contacto fiable con el exterior de la isla. Cuando vuelven, solo queda una señal breve: una fecha, una coordenada y el símbolo de Éclipse.', clues: ['La señal no llegó desde fuera: alguien la preparó dentro de la escuela.', 'La coordenada apunta a un lugar que todos conocen, pero que casi nadie mira.'], mechanic: { requirement: 'REQUIRED', kind: 'CHALLENGE' } },
  { ordinal: 2, key: 't1_el_mensaje', title: 'El mensaje', term: 'T1', finalSceneSummary: 'La señal contiene una frase incompleta. Al ordenar sus fragmentos, aparece una advertencia: el apagón y el silencio del exterior no fueron un accidente, y el siguiente indicio está escondido a plena vista.', clues: ['Las palabras faltantes forman una instrucción, no una contraseña.', 'El mensaje cambia de sentido cuando se lee de derecha a izquierda.', 'La primera pista estaba destinada a quien supiera hacer preguntas.'], mechanic: { requirement: 'OPTIONAL', kind: 'MINIGAME' } },
  { ordinal: 3, key: 't1_eclipse', title: 'Éclipse', term: 'T1', finalSceneSummary: 'Los dos primeros indicios forman el emblema de Éclipse. No es el nombre de una persona ni de un lugar: es el nombre de un protocolo que decide qué información puede verse, oírse y abrirse, y en qué momento.', clues: ['Éclipse no oculta la verdad: decide cuándo puede ser encontrada.', 'El archivo se abrirá cuando la escuela vuelva a escuchar lo que dejó de oír.'], mechanic: { requirement: 'NONE', kind: null } },
  { ordinal: 4, key: 't2_el_expediente', title: 'El expediente', term: 'T2', finalSceneSummary: 'Al comenzar el segundo tramo del curso, aparece un expediente sin nombre. Sus páginas describen decisiones tomadas durante el apagón y el aislamiento, pero cada conclusión está cubierta por una franja de tinta azul.', clues: ['El expediente no registra culpables; registra decisiones.', 'La tinta azul aparece junto a dos verbos: conservar y limitar.', 'Una página pide mantener abierta la señal; otra ordena cerrar el acceso.'], mechanic: { requirement: 'OPTIONAL', kind: 'CHALLENGE' } },
  { ordinal: 5, key: 't2_la_anomalia', title: 'La anomalía', term: 'T2', finalSceneSummary: 'Una línea del expediente no encaja con las demás. La anomalía se repite en tres lugares distintos, como si alguien hubiera dejado una puerta abierta dentro del protocolo.', clues: ['La anomalía no es un error: es una invitación a comprobar el camino.', 'Tres marcas iguales señalan una sola decisión pendiente.', 'La puerta abierta conduce al archivo, pero todavía no permite cruzarlo.'], mechanic: { requirement: 'REQUIRED', kind: 'MINIGAME' } },
  { ordinal: 6, key: 't2_la_reunion', title: 'La reunión', term: 'T2', finalSceneSummary: 'El expediente contiene un acta sin firmas y un fragmento de audio de una reunión que nunca aparece en ningún calendario. Varias voces discuten si el archivo debe conservarse cerrado o abrirse cuando regrese la señal.', clues: ['El acta quedó sin firmas, pero el audio conserva dos voces en desacuerdo.', 'Una voz pide mantener el protocolo hasta que pase el riesgo; otra advierte que el silencio también encierra.'], mechanic: { requirement: 'NONE', kind: null } },
  { ordinal: 7, key: 't3_la_prueba', title: 'La prueba', term: 'T3', finalSceneSummary: 'El archivo ofrece una prueba sencilla: seguir sin cambiar la señal, el mensaje y el expediente, y comprobar si sus tres partes forman una misma historia. La respuesta dependerá de la atención colectiva, no de una respuesta única.', clues: ['La prueba no pide acertar: pide conservar juntos los indicios.', 'Cuando las tres partes coinciden, aparece una fecha sin año.'], mechanic: { requirement: 'OPTIONAL', kind: 'CHALLENGE' } },
  { ordinal: 8, key: 't3_el_archivo_eclipse', title: 'El archivo Éclipse', term: 'T3', finalSceneSummary: 'El archivo finalmente se abre. Registra que Éclipse fue activado durante una emergencia para conservar información y mantener la continuidad de la comunidad. También muestra que filtró comunicaciones y restringió accesos durante el aislamiento: pudo ser una protección necesaria o una forma de confinamiento.', clues: ['El archivo no pertenece a una persona: pertenece a una promesa compartida.', 'La primera activación ocurrió cuando la escuela dejó de recibir señales del exterior.', 'El mismo protocolo que conservó la información decidió qué mensajes podían pasar y cuáles debían esperar.'], mechanic: { requirement: 'REQUIRED', kind: 'MINIGAME' } },
  { ordinal: 9, key: 't3_la_llamada', title: 'La llamada', term: 'T3', finalSceneSummary: 'La señal vuelve una última vez como una comunicación recuperable desde fuera de la isla. El contacto confirma que el exterior existía y que alguien intentó alcanzar la escuela durante el aislamiento, pero no explica por sí solo si las restricciones de Éclipse estaban justificadas.', clues: ['La llamada conserva una fecha, una coordenada y una frase enviada desde el exterior.', 'El mensaje confirma que alguien esperaba respuesta, pero llega incompleto antes de explicar por qué el contacto falló.'], mechanic: { requirement: 'NONE', kind: null } },
] as const satisfies readonly NarrativeCatalogueEvent[];

export const NARRATIVE_CATALOGUE = narrativeCatalogue;

export function findNarrativeEvent(key: string): NarrativeCatalogueEvent | undefined {
  return narrativeCatalogue.find(event => event.key === key);
}
