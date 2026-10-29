const GAMES = [
  { id: 'truco', title: 'Anotador de truco', text: 'Los fósforos en la cara del robot, a 15 o a 30. Festeja cuando anotan ustedes y sufre cuando anotan ellos.' },
  { id: 'tateti', title: 'Ta-te-ti', text: 'En la cara del robot: vos sos la X. A veces se distrae, así que se le puede ganar.' },
  { id: 'ppt', title: 'Piedra, papel o tijera', text: 'Al mejor de los que quieras. En el robot, tocando la pantalla.' },
  { id: 'ojo', title: 'Atrapá el ojo', text: 'Aparece un ojo en cualquier lado: tocalo rápido. 20 segundos.' },
  { id: 'sino', title: 'Sí o no', text: 'Preguntale lo que quieras: responde como bola 8 mágica, moviendo la cabeza.' },
  { id: 'trivia', title: 'Trivia de terror', text: 'Te hace preguntas de películas de terror con su personalidad.' },
];

export default function GamesPanel({ onPlay }) {
  return (
    <div className="games">
      {GAMES.map((g) => (
        <div key={g.id} className="game-card">
          <div>
            <h3>{g.title}</h3>
            <p>{g.text}</p>
          </div>
          <button type="button" onClick={() => onPlay(g.id)}>
            Jugar
          </button>
        </div>
      ))}
    </div>
  );
}
