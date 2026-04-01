import ScreeningApp from '../modules/screening/app/ScreeningApp';

export default function ScreeningPage() {
  return (
    <div className="screening-fullscreen" style={{ minHeight: '100vh', width: '100%', backgroundColor: '#fff' }}>
      <ScreeningApp />
    </div>
  );
}
