import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeSpotifyLogin, saveSpotifyToken } from '../lib/spotify';

export function SpotifyCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('Thiếu mã xác thực từ Spotify.');
      return;
    }
    completeSpotifyLogin(code)
      .then((tokens) => {
        saveSpotifyToken(tokens.access_token, tokens.expires_in);
        navigate('/music', { replace: true });
      })
      .catch(() => setError('Kết nối Spotify thất bại, thử lại nhé.'));
  }, [params, navigate]);

  return (
    <div className="flex h-screen items-center justify-center text-[var(--text-2)]">
      {error ?? 'Đang kết nối Spotify...'}
    </div>
  );
}
