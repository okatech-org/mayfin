import { useState } from 'react';
import { 
  Users, 
  Shield, 
  ShieldCheck,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUsersWithRoles, useUpdateUserRole } from '@/hooks/useUsersRoles';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function UserRolesManager() {
  const { data: users, isLoading, error } = useUsersWithRoles();
  const updateRole = useUpdateUserRole();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    email: string;
    currentRole: 'admin' | 'charge_affaires' | null;
    newRole: 'admin' | 'charge_affaires';
  } | null>(null);

  const filteredUsers = users?.filter(
    (user) => user.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (
    userId: string,
    email: string,
    currentRole: 'admin' | 'charge_affaires' | null,
    newRole: 'admin' | 'charge_affaires'
  ) => {
    setSelectedUser({ userId, email, currentRole, newRole });
    setRoleDialogOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (selectedUser) {
      await updateRole.mutateAsync({
        userId: selectedUser.userId,
        newRole: selectedUser.newRole,
      });
      setRoleDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadge = (role: 'admin' | 'charge_affaires' | null) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Shield className="h-3 w-3 mr-1" />
        Chargé d'affaires
      </Badge>
    );
  };

  const adminCount = users?.filter((u) => u.role === 'admin').length ?? 0;
  const chargeAffairesCount = users?.filter((u) => u.role === 'charge_affaires' || !u.role).length ?? 0;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administrateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{adminCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Chargés d'affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{chargeAffairesCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion des utilisateurs
          </CardTitle>
          <CardDescription>
            Promouvoir ou rétrograder les utilisateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                Erreur de chargement
              </h3>
              <p className="text-sm text-muted-foreground">
                Impossible de charger les utilisateurs
              </p>
            </div>
          ) : filteredUsers?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                Aucun utilisateur trouvé
              </h3>
              <p className="text-sm text-muted-foreground">
                Aucun utilisateur ne correspond à votre recherche
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle actuel</TableHead>
                    <TableHead>Inscrit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => {
                    const isCurrentUser = user.user_id === currentUser?.id;
                    const effectiveRole = user.role || 'charge_affaires';
                    
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.email}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">
                                Vous
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(user.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {effectiveRole === 'admin' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleRoleChange(
                                  user.user_id,
                                  user.email,
                                  user.role,
                                  'charge_affaires'
                                )
                              }
                              disabled={isCurrentUser || updateRole.isPending}
                            >
                              Rétrograder
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                handleRoleChange(
                                  user.user_id,
                                  user.email,
                                  user.role,
                                  'admin'
                                )
                              }
                              disabled={updateRole.isPending}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Promouvoir Admin
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change confirmation dialog */}
      <AlertDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.newRole === 'admin'
                ? 'Promouvoir en administrateur'
                : 'Rétrograder en chargé d\'affaires'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.newRole === 'admin' ? (
                <>
                  Êtes-vous sûr de vouloir promouvoir{' '}
                  <strong>{selectedUser?.email}</strong> en administrateur ?
                  <br />
                  <br />
                  Cette personne aura accès à la page d'administration et pourra
                  gérer les rôles des utilisateurs.
                </>
              ) : (
                <>
                  Êtes-vous sûr de vouloir rétrograder{' '}
                  <strong>{selectedUser?.email}</strong> en chargé d'affaires ?
                  <br />
                  <br />
                  Cette personne n'aura plus accès à la page d'administration.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRoleChange}
              disabled={updateRole.isPending}
              className={
                selectedUser?.newRole === 'admin'
                  ? ''
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {updateRole.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : selectedUser?.newRole === 'admin' ? (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Promouvoir
                </>
              ) : (
                'Rétrograder'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
