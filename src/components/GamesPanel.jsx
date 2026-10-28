const GAMES = [
  { id: 'ppt', title: 'Piedra, papel o tijera', text: 'Al mejor de los que quieras. En el robot, tocando la pantalla.' },
  { id: 'ojo', title: 'Atrapá el ojo', text: 'Aparece un ojo en cualquier lado: tocalo rápido. 20 segundos.' },
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
