import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { DossiersList } from '@/components/dossiers/DossiersList';
import { mockDossiers } from '@/data/mockData';

export default function DossiersPage() {
  return (
    <Layout>
      <Header 
        title="Dossiers" 
        subtitle="Gérez vos dossiers de financement"
      />
      
      <div className="p-6">
        <DossiersList dossiers={mockDossiers} />
      </div>
    </Layout>
  );
}
