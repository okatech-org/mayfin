import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Lock, CheckCircle } from 'lucide-react';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import logoMayfin from '@/assets/logo-mayfin.png';

const schema = z.object({
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string().min(1, 'La confirmation est requise'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Check URL for error
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        if (error) {
          setIsValidToken(false);
          toast.error('Le lien de réinitialisation est invalide ou a expiré');
        }
      }
    };
    checkSession();
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast.error(error.message || 'Erreur lors de la mise à jour');
        return;
      }

      setIsSuccess(true);
      toast.success('Mot de passe mis à jour avec succès');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      toast.error('Une erreur est survenue');
    } finally {
      setIsLoading(false);
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
            className="h-10 w-auto object-contain"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold text-sidebar-foreground leading-tight">
            Réinitialisez<br />votre mot de passe<br />en toute sécurité.
          </h2>
          <p className="text-lg text-sidebar-foreground/70 max-w-md">
            Choisissez un nouveau mot de passe sécurisé pour protéger votre compte.
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

      {/* Right side - Reset form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center mb-8 justify-center">
            <img 
              src={logoMayfin} 
              alt="MayFin" 
              className="h-8 w-auto object-contain"
            />
          </div>

          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Mot de passe mis à jour</h2>
              <p className="text-muted-foreground">
                Votre mot de passe a été modifié avec succès. Vous allez être redirigé...
              </p>
            </div>
          ) : !isValidToken ? (
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Lien invalide</h2>
              <p className="text-muted-foreground">
                Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
              </p>
              <Button onClick={() => navigate('/login')} className="mt-4">
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h2>
                <p className="text-muted-foreground mt-2">
                  Choisissez un nouveau mot de passe pour votre compte
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              type={showPassword ? 'text' : 'password'} 
                              placeholder="••••••••" 
                              className="h-11 pl-10 pr-10"
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
                        <PasswordStrengthIndicator password={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmer le mot de passe</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              {...field} 
                              type={showConfirmPassword ? 'text' : 'password'} 
                              placeholder="••••••••" 
                              className="h-11 pl-10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      'Mettre à jour le mot de passe'
                    )}
                  </Button>
                </form>
              </Form>
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