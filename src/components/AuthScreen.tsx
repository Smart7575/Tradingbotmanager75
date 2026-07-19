import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, User, Mail, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Clear errors when switching tabs
  useEffect(() => {
    setError(null);
    setMessage(null);
  }, [isLogin]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const loggedUser = {
        id: userCredential.user.uid,
        username: userCredential.user.email?.split('@')[0] || 'trader',
        email: userCredential.user.email || '',
        fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Stefan Trader',
        avatarUrl: userCredential.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userCredential.user.email || 'trader')}`
      };
      onLoginSuccess(loggedUser);
    } catch (e: any) {
      console.error('Google Sign-In Error:', e);
      if (e.code === 'auth/popup-blocked') {
        setError('Popup geblokkeerd! Sta popups toe voor deze website om in te loggen met Google.');
      } else if (e.code === 'auth/unauthorized-domain') {
        setError(
          '🔒 Google Sign-In is nog niet geautoriseerd voor dit domein in Firebase!\n\n' +
          'Om dit op te lossen in uw Firebase Project:\n' +
          '1. Ga naar de Firebase Console (console.firebase.google.com)\n' +
          '2. Ga naar Authentication > Instellingen (Settings) > Geautoriseerde domeinen (Authorized domains)\n' +
          '3. Klik op "Domein toevoegen" en voeg dit domein toe:\n' +
          '   ' + window.location.hostname + '\n\n' +
          '💡 Snelle oplossing: Klik hieronder op "Direct inloggen met Demo Account" of vul hierboven een e-mail en wachtwoord in om direct in te loggen zonder Google Auth.'
        );
      } else {
        setError(e.message || 'Fout bij het inloggen met Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoSignIn = async () => {
    setDemoLoading(true);
    setError(null);
    setMessage(null);
    const demoEmail = 'demo@etoro-bot.com';
    const demoPassword = 'demoPassword123';
    
    try {
      // 1. Try to sign in with standard email/password
      const userCredential = await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      onLoginSuccess({
        id: userCredential.user.uid,
        username: 'demotrader',
        email: userCredential.user.email || '',
        fullName: 'Demo Trader',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=demotrader`
      });
    } catch (err: any) {
      // 2. If user doesn't exist, automatically register the demo account!
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          await updateProfile(userCredential.user, {
            displayName: 'Demo Trader'
          });
          onLoginSuccess({
            id: userCredential.user.uid,
            username: 'demotrader',
            email: userCredential.user.email || '',
            fullName: 'Demo Trader',
            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=demotrader`
          });
        } catch (regErr: any) {
          console.error(regErr);
          setError('Fout bij het aanmaken van demo-account: ' + regErr.message);
        }
      } else {
        console.error(err);
        setError('Inloggen met demo mislukt: ' + err.message);
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow via Firebase
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          onLoginSuccess({
            id: userCredential.user.uid,
            username: userCredential.user.email?.split('@')[0] || 'trader',
            email: userCredential.user.email || '',
            fullName: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Stefan Trader',
            avatarUrl: userCredential.user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userCredential.user.email || 'trader')}`
          });
        } catch (loginErr: any) {
          if (loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/user-not-found') {
            // User doesn't exist; try auto-register to prevent manual configuration blocks
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              onLoginSuccess({
                id: userCredential.user.uid,
                username: userCredential.user.email?.split('@')[0] || 'trader',
                email: userCredential.user.email || '',
                fullName: userCredential.user.email?.split('@')[0] || 'Stefan Trader',
                avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userCredential.user.email || 'trader')}`
              });
            } catch (regErr: any) {
              // Throw original login error if registration also fails (e.g. invalid-email or wrong password for existing user)
              throw loginErr;
            }
          } else {
            throw loginErr;
          }
        }
      } else {
        // Register flow via Firebase
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Set display name to full name
        if (fullName) {
          await updateProfile(userCredential.user, {
            displayName: fullName
          });
        }

        setMessage("Account succesvol aangemaakt! U bent nu direct ingelogd.");
        
        onLoginSuccess({
          id: userCredential.user.uid,
          username: userCredential.user.email?.split('@')[0] || 'trader',
          email: userCredential.user.email || '',
          fullName: fullName || userCredential.user.email?.split('@')[0] || 'Stefan Trader',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userCredential.user.email || 'trader')}`
        });
      }
    } catch (err: any) {
      console.error(err);
      let dutchError = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        dutchError = 'Ongeldig e-mailadres of wachtwoord.';
      } else if (err.code === 'auth/email-already-in-use') {
        dutchError = 'Dit e-mailadres is al in gebruik.';
      } else if (err.code === 'auth/weak-password') {
        dutchError = 'Het wachtwoord moet minimaal 6 tekens bevatten.';
      } else if (err.code === 'auth/invalid-email') {
        dutchError = 'Ongeldig e-mailadres.';
      }
      setError(dutchError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="flex items-center justify-center min-h-screen bg-slate-950 px-4 py-12 relative overflow-hidden font-sans">
      
      {/* Visual background accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 mb-4 border border-cyan-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
              {isLogin ? 'eToro Bot Dashboard' : 'Maak een account aan'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isLogin ? 'Log in om uw geautomatiseerde handelsbots te beheren' : 'Registreer om te beginnen met geautomatiseerde handel'}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl text-left font-medium whitespace-pre-line leading-relaxed shadow-inner">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-lg text-center font-medium">
              {message}
            </div>
          )}

          {/* Core Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Volledige Naam</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Stefan de Vries"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">E-mailadres</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="stefan@voorbeeld.nl"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">Wachtwoord</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || demoLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold py-2.5 rounded-xl transition duration-200 flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed mt-6 group animate-none"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Inloggen' : 'Registreren'}
                  <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase font-mono absolute">of</span>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading || demoLoading}
            className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 font-medium py-2.5 rounded-xl transition duration-200 flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Inloggen met Google</span>
              </>
            )}
          </button>

          {/* Demo Sign-In Button */}
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={loading || googleLoading || demoLoading}
            className="w-full mt-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-medium py-2.5 rounded-xl transition duration-200 flex items-center justify-center text-xs disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {demoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                <span>Direct inloggen met Demo Account</span>
              </>
            )}
          </button>

          {/* Toggle Tab Footer */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading || googleLoading || demoLoading}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition duration-200"
            >
              {isLogin ? 'Nieuw hier? Maak een gratis account aan' : 'Heeft u al een account? Log direct in'}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
