import { AdminSystemLayout } from '@/components/admin-system/AdminSystemLayout';
import {
    Settings,
    Database,
    Shield,
    Bell,
    Globe,
    Mail,
    Server
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function SystemSettingsPage() {
    return (
        <AdminSystemLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">Paramètres Système</h1>
                    <p className="text-slate-400 mt-1">
                        Configuration globale de la plateforme
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Security Settings */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Sécurité
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Paramètres de sécurité de la plateforme
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Authentification 2FA</Label>
                                    <p className="text-xs text-slate-400">
                                        Exiger l'authentification à deux facteurs
                                    </p>
                                </div>
                                <Switch />
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Sessions multiples</Label>
                                    <p className="text-xs text-slate-400">
                                        Autoriser les connexions simultanées
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Journalisation avancée</Label>
                                    <p className="text-xs text-slate-400">
                                        Enregistrer toutes les actions utilisateur
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notifications
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Configuration des notifications système
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Alertes email</Label>
                                    <p className="text-xs text-slate-400">
                                        Envoyer des alertes par email
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Rapport hebdomadaire</Label>
                                    <p className="text-xs text-slate-400">
                                        Envoyer un rapport d'activité chaque semaine
                                    </p>
                                </div>
                                <Switch />
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-white">Alertes de sécurité</Label>
                                    <p className="text-xs text-slate-400">
                                        Notifier les tentatives de connexion suspectes
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Database Settings */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Base de données
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Informations sur la base de données
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Provider</span>
                                <span className="text-sm text-white font-medium">Supabase</span>
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Région</span>
                                <span className="text-sm text-white font-medium">EU West</span>
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-400">Version</span>
                                <span className="text-sm text-white font-medium">PostgreSQL 15</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* API Settings */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Server className="h-5 w-5" />
                                API & Intégrations
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Configuration des APIs externes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-400">API INSEE</span>
                                </div>
                                <span className="text-sm text-green-500 font-medium">Connecté</span>
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-400">Email SMTP</span>
                                </div>
                                <span className="text-sm text-green-500 font-medium">Configuré</span>
                            </div>
                            <Separator className="bg-slate-800" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Settings className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-400">Gemini AI</span>
                                </div>
                                <span className="text-sm text-green-500 font-medium">Actif</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminSystemLayout>
    );
}
