import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { DossiersList } from '@/components/dossiers/DossiersList';
import { useDossiers } from '@/hooks/useDossiers';
import { Loader2 } from 'lucide-react';

export default function DossiersPage() {
  const { data: dossiers, isLoading, error } = useDossiers();

  return (
    <Layout>
      <Header 
        title="Dossiers" 
        subtitle="Gérez vos dossiers de financement"
      />
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            Erreur lors du chargement des dossiers
          </div>
        ) : (
          <DossiersList dossiers={dossiers || []} />
        )}
      </div>
    </Layout>
  );
}
