import { useState } from 'react';
import { AdminSystemLayout } from '@/components/admin-system/AdminSystemLayout';
import {
    Users,
    Search,
    MoreVertical,
    Shield,
    Briefcase,
    Loader2,
    UserPlus,
    Mail,
    Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAdminUsers, useUpdateUserRole } from '@/hooks/useAdminUsers';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function UsersManagementPage() {
    const { data: users, isLoading } = useAdminUsers();
    const updateRole = useUpdateUserRole();
    const [search, setSearch] = useState('');
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<{
        id: string;
        email: string;
        currentRole: string;
    } | null>(null);
    const [newRole, setNewRole] = useState<string>('');

    const filteredUsers = users?.filter(
        (user) =>
            user.email?.toLowerCase().includes(search.toLowerCase()) ||
            user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleRoleChange = (user: { id: string; email: string; role: string }) => {
        setSelectedUser({ id: user.id, email: user.email, currentRole: user.role });
        setNewRole(user.role);
        setRoleDialogOpen(true);
    };

    const handleConfirmRoleChange = async () => {
        if (selectedUser && newRole && newRole !== selectedUser.currentRole) {
            try {
                await updateRole.mutateAsync({
                    userId: selectedUser.id,
                    role: newRole as 'admin' | 'charge_affaires'
                });
                toast.success(`Rôle de ${selectedUser.email} mis à jour`);
                setRoleDialogOpen(false);
                setSelectedUser(null);
            } catch (error) {
                toast.error('Erreur lors de la mise à jour du rôle');
            }
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <Badge className="bg-red-600 hover:bg-red-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                    </Badge>
                );
            case 'charge_affaires':
                return (
                    <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Chargé d'affaires
                    </Badge>
                );
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <AdminSystemLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gestion des utilisateurs</h1>
                        <p className="text-slate-400 mt-1">
                            Gérez les comptes et les permissions des utilisateurs
                        </p>
                    </div>
                    <Button className="bg-red-600 hover:bg-red-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Inviter un utilisateur
                    </Button>
                </div>

                {/* Users Table */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Utilisateurs ({filteredUsers?.length ?? 0})
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                            Liste de tous les utilisateurs de la plateforme
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Search */}
                        <div className="relative mb-4 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            </div>
                        ) : filteredUsers?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Users className="h-12 w-12 text-slate-600 mb-4" />
                                <h3 className="text-lg font-medium text-white mb-1">
                                    Aucun utilisateur trouvé
                                </h3>
                                <p className="text-sm text-slate-400">
                                    Modifiez votre recherche ou invitez des utilisateurs
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border border-slate-800 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-slate-800 hover:bg-slate-800/50">
                                            <TableHead className="text-slate-400">Utilisateur</TableHead>
                                            <TableHead className="text-slate-400">Email</TableHead>
                                            <TableHead className="text-slate-400">Rôle</TableHead>
                                            <TableHead className="text-slate-400">Inscrit</TableHead>
                                            <TableHead className="text-right text-slate-400">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers?.map((user) => (
                                            <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700">
                                                            <Users className="h-4 w-4 text-slate-300" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">
                                                                {user.first_name || user.last_name
                                                                    ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                                                                    : 'Non renseigné'}
                                                            </p>
                                                            <p className="text-sm text-slate-400">
                                                                {user.phone || '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-300">
                                                        <Mail className="h-4 w-4 text-slate-500" />
                                                        {user.email}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getRoleBadge(user.role)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Calendar className="h-4 w-4" />
                                                        {user.created_at
                                                            ? formatDistanceToNow(new Date(user.created_at), {
                                                                addSuffix: true,
                                                                locale: fr,
                                                            })
                                                            : '—'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                                            <DropdownMenuLabel className="text-slate-300">Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-slate-700" />
                                                            <DropdownMenuItem
                                                                className="text-slate-300 focus:bg-slate-700 focus:text-white cursor-pointer"
                                                                onClick={() => handleRoleChange({
                                                                    id: user.user_id,
                                                                    email: user.email,
                                                                    role: user.role
                                                                })}
                                                            >
                                                                <Shield className="h-4 w-4 mr-2" />
                                                                Modifier le rôle
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Role Change Dialog */}
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                    <DialogContent className="bg-slate-900 border-slate-800">
                        <DialogHeader>
                            <DialogTitle className="text-white">Modifier le rôle</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Changez le rôle de l'utilisateur {selectedUser?.email}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Select value={newRole} onValueChange={setNewRole}>
                                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                    <SelectValue placeholder="Sélectionner un rôle" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="admin" className="text-white focus:bg-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-red-500" />
                                            Administrateur
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="charge_affaires" className="text-white focus:bg-slate-700">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-blue-500" />
                                            Chargé d'affaires
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setRoleDialogOpen(false)}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            >
                                Annuler
                            </Button>
                            <Button
                                onClick={handleConfirmRoleChange}
                                disabled={updateRole.isPending || newRole === selectedUser?.currentRole}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {updateRole.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Mise à jour...
                                    </>
                                ) : (
                                    'Confirmer'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminSystemLayout>
    );
}
