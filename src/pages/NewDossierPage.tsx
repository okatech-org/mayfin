import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { DossierForm } from '@/components/dossiers/DossierForm';

export default function NewDossierPage() {
  return (
    <Layout>
      <Header 
        title="Nouveau dossier" 
        subtitle="Créez un nouveau dossier de demande de financement"
      />
      
      <div className="p-6">
        <DossierForm />
      </div>
    </Layout>
  );
}
