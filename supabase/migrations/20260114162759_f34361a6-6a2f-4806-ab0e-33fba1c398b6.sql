-- Sécuriser la table profiles contre l'accès anonyme
-- Les politiques existantes utilisent auth.uid() = user_id, mais cela ne bloque pas
-- explicitement les utilisateurs non authentifiés car la comparaison NULL = user_id retourne NULL

-- Supprimer les politiques existantes et les recréer avec une vérification explicite d'authentification
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recréer les politiques avec vérification explicite que l'utilisateur est authentifié
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Ajouter une politique explicite de blocage pour les lectures anonymes (défense en profondeur)
-- Note: Les politiques USING avec auth.uid() IS NOT NULL suffisent, mais cette approche documente l'intention

-- Également ajouter une politique permettant aux admins de voir les profils pour la gestion des utilisateurs
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);