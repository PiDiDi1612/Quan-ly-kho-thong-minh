import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, X, Lock, User as UserIcon, Mail, Shield, Key, ToggleLeft, Settings, Save } from 'lucide-react';
import { User, UserRole, Permission } from '../../types';
import { ROLE_PERMISSIONS, PERMISSIONS, VISIBLE_PERMISSIONS } from '../../constants';
import { Modal } from '../../components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { apiService } from '../../services/api';

import { userService } from '../../domain';
import { useToast } from '../../hooks/useToast';

interface UserManagementProps {
    users: User[];
    currentUser: User | null;
    onUpdate: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onUpdate }) => {
    const toast = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<Partial<User>>({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'GUEST',
        permissions: [],
        isActive: true
    });

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                ...user,
                password: '',
                // Ensure ADMIN always shows all permissions even if DB had less (for consistency)
                permissions: user.role === 'ADMIN' ? Object.keys(PERMISSIONS) as Permission[] : user.permissions,
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                password: '',
                fullName: '',
                email: '',
                role: 'GUEST',
                permissions: ROLE_PERMISSIONS.GUEST,
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.username || !formData.fullName || (!editingUser && !formData.password)) {
            toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc.');
            return;
        }

        try {
            if (editingUser) {
                // Update existing user
                await userService.updateUser(editingUser.id, {
                    fullName: formData.fullName,
                    email: formData.email,
                    role: formData.role,
                    permissions: formData.role === 'ADMIN' ? Object.keys(PERMISSIONS) as Permission[] : formData.permissions,
                    password: formData.password || undefined, // Only send if set
                    isActive: formData.isActive
                });
            } else {
                // Create new user
                await userService.createUser({
                    username: formData.username!,
                    password: formData.password!,
                    fullName: formData.fullName!,
                    email: formData.email,
                    role: formData.role || 'GUEST',
                    permissions: formData.role === 'ADMIN' ? Object.keys(PERMISSIONS) as Permission[] : formData.permissions,
                    createdBy: currentUser?.id
                });
            }

            // Log activity
            const action = editingUser ? `Cập nhật người dùng ${formData.username}` : `Tạo người dùng mới ${formData.username}`;
            await apiService.post('/api/activity_logs/save', {
                id: `log-${Date.now()}`,
                userId: currentUser?.id,
                username: currentUser?.username,
                action: action,
                entityType: 'USER',
                entityId: editingUser ? editingUser.id : 'unknown', // ID is generated on server/service, we don't know it here easily without return
                details: action,
                timestamp: new Date().toISOString()
            });

            setIsModalOpen(false);
            onUpdate();
        } catch (error: any) {
            console.error('Failed to save user:', error);
            alert(error.message || 'Lỗi khi lưu người dùng');
        }
    };

    const handleDelete = async (userId: string) => {
        setConfirmState({
            isOpen: true,
            title: 'Xóa người dùng',
            message: `Bạn có chắc chắn muốn xóa người dùng này? Thao tác này không thể hoàn tác.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await userService.deleteUser(userId);
                    // Log activity
                    const safeUsers = Array.isArray(users) ? users : [];
                    await apiService.post('/api/activity_logs/save', {
                        id: `log-${Date.now()}`,
                        userId: currentUser?.id,
                        username: currentUser?.username,
                        action: `Xóa người dùng ${safeUsers.find(u => u.id === userId)?.username}`,
                        entityType: 'USER',
                        entityId: userId,
                        details: 'Xóa người dùng',
                        timestamp: new Date().toISOString()
                    });
                    onUpdate();
                } catch (error: any) {
                    console.error('Failed to delete user:', error);
                    alert(error.message || 'Lỗi khi xóa người dùng');
                }
            }
        });
    };

    const handleToggleStatus = async (user: User) => {
        try {
            await userService.updateUser(user.id, { isActive: !user.isActive });
            // Log activity
            await apiService.post('/api/activity_logs/save', {
                id: `log-${Date.now()}`,
                userId: currentUser?.id,
                username: currentUser?.username,
                action: `${!user.isActive ? 'Kích hoạt' : 'Vô hiệu hóa'} người dùng ${user.username}`,
                entityType: 'USER',
                entityId: user.id,
                details: 'Thay đổi trạng thái',
                timestamp: new Date().toISOString()
            });
            onUpdate();
        } catch (error: any) {
            console.error('Failed to toggle status:', error);
            alert(error.message || 'Lỗi khi thay đổi trạng thái');
        }
    };

    const togglePermission = (perm: Permission) => {
        // ADMIN always has all permissions - cannot be changed
        if (formData.role === 'ADMIN') return;

        const currentPerms = formData.permissions || [];
        if (currentPerms.includes(perm)) {
            setFormData({ ...formData, permissions: currentPerms.filter(p => p !== perm) });
        } else {
            setFormData({ ...formData, permissions: [...currentPerms, perm] });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500 font-medium">
                    Tổng số người dùng: <span className="text-sky-600 font-bold">{users.length}</span>
                </p>
                <button
                    onClick={() => handleOpenModal()}
                    className="h-11 px-6 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={18} className="stroke-[3]" />
                    Thêm người dùng
                </button>
            </div>

            <div className="bg-transparent">
                <table className="w-full text-left text-sm border-separate border-spacing-y-3 px-1">
                    <thead>
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><UserIcon size={12} className="inline mr-1 text-sky-500 -mt-0.5" />Người dùng</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><Shield size={12} className="inline mr-1 text-indigo-500 -mt-0.5" />Vai trò</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><Key size={12} className="inline mr-1 text-amber-500 -mt-0.5" />Quyền hạn</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider"><ToggleLeft size={12} className="inline mr-1 text-emerald-500 -mt-0.5" />Trạng thái</th>
                            <th className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider text-right"><Settings size={12} className="inline mr-1 -mt-0.5" />Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 group">
                                <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center font-bold text-sm">
                                            {(u.fullName || u.username || '?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{u.fullName || u.username}</p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">@{u.username} {u.email && `• ${u.email}`}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${u.role === 'ADMIN' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                        u.role === 'WAREHOUSE' ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' :
                                            u.role === 'PLANNING' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                                                'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                        }`}>
                                        {u.role === 'ADMIN' ? 'Quản trị viên' : u.role === 'WAREHOUSE' ? 'Quản lý kho' : u.role === 'PLANNING' ? 'Phòng kế hoạch' : 'Khách'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {u.role === 'ADMIN' ? (
                                            <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded text-[9px] font-bold uppercase">Toàn quyền hệ thống</span>
                                        ) : (
                                            <>
                                                {u.permissions.slice(0, 3).map(p => (
                                                    <span key={p} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-[9px] font-bold uppercase truncate max-w-[80px]">
                                                        {PERMISSIONS[p]?.split(' ')[0]}...
                                                    </span>
                                                ))}
                                                {u.permissions.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[9px] font-bold">+{u.permissions.length - 3}</span>
                                                )}
                                                {u.permissions.length === 0 && (
                                                    <span className="text-[10px] text-slate-400 italic">Chưa cấp quyền</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-600 font-medium mt-1">
                                        {u.lastLogin ? `Đăng nhập: ${new Date(u.lastLogin).toLocaleDateString('en-GB')}` : 'Chưa đăng nhập'}
                                    </p>
                                </td>
                                <td className="px-6 py-5 border-y border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${u.isActive ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        }`}>
                                        {u.isActive ? 'Hoạt động' : 'Vô hiệu'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 dark:border-slate-700 group-hover:border-sky-100 dark:group-hover:border-sky-900/50 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenModal(u)}
                                            className="!p-2 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-slate-400 hover:text-sky-600"
                                        >
                                            <Edit2 size={18} />
                                        </Button>
                                        {u.id !== currentUser?.id && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(u)}
                                                    className={`!p-2 hover:bg-opacity-50 ${u.isActive ? 'text-slate-400 hover:text-orange-500' : 'text-slate-400 hover:text-green-500'}`}
                                                >
                                                    {u.isActive ? <X size={18} /> : <CheckCircle2 size={18} />}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(u.id)}
                                                    className="!p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Tên đăng nhập <span className="text-red-500 font-bold">*</span></label>
                            <div className="relative group">
                                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="VD: ADMIN"
                                    disabled={!!editingUser}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Họ và tên <span className="text-red-500 font-bold">*</span></label>
                            <div className="relative group">
                                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder="VD: NGUYỄN VĂN A"
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Mật khẩu {!editingUser && <span className="text-red-500 font-bold">*</span>}</label>
                            <div className="relative group">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={editingUser ? "ĐỂ TRỐNG NẾU KHÔNG ĐỔI" : "******"}
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase ml-1 tracking-wider">Email</label>
                            <div className="relative group">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="VD: EMAIL@EXAMPLE.COM"
                                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-sm text-slate-800 dark:text-slate-200 uppercase outline-none focus:ring-2 focus:ring-sky-500/20 shadow-sm transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Vai trò & Trạng thái</label>
                        {editingUser?.role === 'ADMIN' && (
                            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 flex items-center gap-2">
                                <Shield size={14} /> Không thể thay đổi vai trò của Quản trị viên.
                            </p>
                        )}
                        <div className="flex gap-4 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            {(['ADMIN', 'WAREHOUSE', 'PLANNING', 'GUEST'] as UserRole[]).map(r => {
                                const roleLabel = r === 'ADMIN' ? 'Quản trị' : r === 'WAREHOUSE' ? 'Kho' : r === 'PLANNING' ? 'Kế hoạch' : 'Khách';
                                const isActive = formData.role === r;
                                const colors = r === 'ADMIN' ? 'from-rose-500 to-red-600' :
                                    r === 'WAREHOUSE' ? 'from-sky-500 to-indigo-600' :
                                        r === 'PLANNING' ? 'from-purple-500 to-violet-600' :
                                            'from-slate-500 to-slate-600';

                                return (
                                    <button
                                        key={r}
                                        disabled={editingUser?.role === 'ADMIN'}
                                        onClick={() => setFormData({ ...formData, role: r, permissions: ROLE_PERMISSIONS[r] })}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 ${isActive
                                            ? `bg-gradient-to-r ${colors} text-white shadow-lg`
                                            : editingUser?.role === 'ADMIN'
                                                ? 'bg-transparent text-slate-300 cursor-not-allowed'
                                                : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                            }`}
                                    >
                                        {roleLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Shield size={14} /> Phân quyền chi tiết
                            </label>
                            <span className="text-[10px] text-slate-400">{formData.role === 'ADMIN' ? Object.keys(PERMISSIONS).length : formData.permissions?.length} quyền được chọn</span>
                        </div>

                        {formData.role === 'ADMIN' && (
                            <p className="text-xs text-sky-600 bg-sky-50 dark:bg-sky-900/20 p-2 rounded-lg border border-sky-100 flex items-center gap-2">
                                <Lock size={14} /> Vai trò Quản trị viên luôn được cấp toàn quyền.
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {VISIBLE_PERMISSIONS.map(perm => {
                                const isChecked = formData.role === 'ADMIN' || formData.permissions?.includes(perm);
                                const isDisabled = formData.role === 'ADMIN';

                                return (
                                    <label
                                        key={perm}
                                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${isDisabled ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                                            } ${isChecked ? 'border-sky-200 bg-sky-50/50' : 'border-slate-100 dark:border-slate-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-sky-600 border-sky-600' : 'border-slate-300'
                                            }`}>
                                            {isChecked && <CheckCircle2 size={12} className="text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            disabled={isDisabled}
                                            onChange={() => togglePermission(perm)}
                                        />
                                        <span className={`text-xs font-medium ${isDisabled ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {PERMISSIONS[perm]}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-black text-xs uppercase text-slate-400 hover:text-rose-500 transition-all">Hủy bỏ</button>
                        <button onClick={handleSave} className="px-10 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black shadow-xl shadow-emerald-500/20 active:scale-95 transition-all uppercase text-xs tracking-widest flex items-center gap-2">
                            <Save size={16} /> Lưu thông tin
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
                type={confirmState.type}
            />
        </div>
    );
};

