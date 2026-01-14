import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import logoMayfin from '@/assets/logo-mayfin.png';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const resetSchema = z.object({
  email: z.string().email('Email invalide'),
});

type FormData = z.infer<typeof schema>;
type ResetFormData = z.infer<typeof resetSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    const { error } = isSignUp 
      ? await signUp(data.email, data.password)
      : await signIn(data.email, data.password);
    
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message || 'Erreur de connexion');
      return;
    }
    
    toast.success(isSignUp ? 'Compte créé avec succès' : 'Connexion réussie');
    navigate('/');
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setIsResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message || 'Erreur lors de l\'envoi');
        return;
      }

      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
      setShowResetPassword(false);
      resetForm.reset();
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-between p-12">
        <div className="flex items-center">
          <img 
            src={logoMayfin} 
            alt="MayFin" 
            className="h-16 w-auto object-contain"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Analysez vos dossiers<br />de financement<br />en toute confiance.
          </h2>
          <p className="text-lg text-sidebar-foreground/70 max-w-md">
            Une solution complète pour évaluer les demandes de crédit des TPE et entreprises en redressement.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-sidebar-foreground/50">
          <span>Sécurisé</span>
          <span className="w-1 h-1 rounded-full bg-sidebar-foreground/30" />
          <span>Conforme RGPD</span>
          <span className="w-1 h-1 rounded-full bg-sidebar-foreground/30" />
          <span>Usage professionnel</span>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center mb-8 justify-center">
            <img 
              src={logoMayfin} 
              alt="MayFin" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {showResetPassword ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">Mot de passe oublié</h2>
                <p className="text-muted-foreground mt-2">
                  Entrez votre email pour recevoir un lien de réinitialisation
                </p>
              </div>

              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-6">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email professionnel</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="prenom.nom@bnpparibas.com" 
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11" disabled={isResetting}>
                    {isResetting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer le lien'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Retour à la connexion
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">Connexion</h2>
                <p className="text-muted-foreground mt-2">
                  Accédez à votre espace d'analyse de dossiers
                </p>
              </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email professionnel</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        placeholder="prenom.nom@bnpparibas.com" 
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          {...field} 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder="••••••••" 
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    {isSignUp && <PasswordStrengthIndicator password={field.value} />}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isSignUp ? 'Création...' : 'Connexion en cours...'}
                  </>
                ) : (
                  isSignUp ? 'Créer un compte' : 'Se connecter'
                )}
              </Button>
            </form>
          </Form>

              <div className="text-center mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
                >
                  Mot de passe oublié ?
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Application à usage professionnel uniquement
          </p>
        </div>
      </div>
    </div>
  );
}
