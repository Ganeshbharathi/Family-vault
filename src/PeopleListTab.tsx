import React, { useState } from 'react';
import {
  Users,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  FileText,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { PersonRecord, FinancialDocument } from './types.ts';

interface PeopleListTabProps {
  people: PersonRecord[];
  documents: FinancialDocument[];
  onAddPerson: (person: Omit<PersonRecord, 'id'>) => void;
  onUpdatePerson: (person: PersonRecord, oldName?: string) => void;
  onDeletePerson: (personId: string, personName: string) => void;
  onNavigateToPersonDocs?: (personName: string) => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

const PASSWORD_KEY = 'ganesh22';

export const PeopleListTab: React.FC<PeopleListTabProps> = ({
  people,
  documents,
  onAddPerson,
  onUpdatePerson,
  onDeletePerson,
  onNavigateToPersonDocs,
  isUnlocked,
  onUnlock,
  onLock,
}) => {
  // Password screen state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Add person form state
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState('');

  // Editing person state
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  // Delete confirmation modal state
  const [personToDelete, setPersonToDelete] = useState<PersonRecord | null>(null);

  // Compute document count per person
  const getDocCountForPerson = (name: string) => {
    const clean = name.trim().toLowerCase();
    return documents.filter((d) => (d.personTag || '').trim().toLowerCase() === clean).length;
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === PASSWORD_KEY) {
      setPasswordError('');
      setPasswordInput('');
      onUnlock();
    } else {
      setPasswordError('Incorrect password. Please enter the valid administrator password.');
    }
  };

  const handleCreatePerson = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newName.trim();
    if (!clean) {
      setAddError('Person name is required.');
      return;
    }
    if (people.some((p) => p.name.trim().toLowerCase() === clean.toLowerCase())) {
      setAddError(`"${clean}" is already in the people list.`);
      return;
    }

    onAddPerson({
      name: clean,
      relationship: newRelationship.trim() || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setNewName('');
    setNewRelationship('');
    setNewNotes('');
    setAddError('');
    setIsAddFormOpen(false);
  };

  const handleStartEdit = (person: PersonRecord) => {
    setEditingPersonId(person.id);
    setEditName(person.name);
    setEditRelationship(person.relationship || '');
    setEditNotes(person.notes || '');
    setEditError('');
  };

  const handleSaveEdit = (person: PersonRecord) => {
    const clean = editName.trim();
    if (!clean) {
      setEditError('Name cannot be empty.');
      return;
    }
    const isDuplicate = people.some(
      (p) => p.id !== person.id && p.name.trim().toLowerCase() === clean.toLowerCase()
    );
    if (isDuplicate) {
      setEditError(`Another person with the name "${clean}" already exists.`);
      return;
    }

    const oldName = person.name;
    onUpdatePerson(
      {
        ...person,
        name: clean,
        relationship: editRelationship.trim() || undefined,
        notes: editNotes.trim() || undefined,
      },
      oldName
    );

    setEditingPersonId(null);
    setEditError('');
  };

  const handleConfirmDelete = () => {
    if (!personToDelete) return;
    onDeletePerson(personToDelete.id, personToDelete.name);
    setPersonToDelete(null);
  };

  // Locked View: Password Entry Screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Protected People Directory</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            This section controls the master family members list used across the entire application and document dropdowns. Enter password to access, edit, or delete people.
          </p>
        </div>

        <form onSubmit={handleUnlockSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter Section Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter password..."
                className="w-full pl-9 pr-10 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock People List</span>
          </button>
        </form>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11.5px] text-slate-600 leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            <strong>Safety Mechanism:</strong> Deleting a person is strictly restricted to this password-protected section to prevent accidental deletion from document dropdowns.
          </span>
        </div>
      </div>
    );
  }

  // Unlocked View: Master Directory Management
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>People List</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 font-mono">
                {people.length} {people.length === 1 ? 'Person' : 'People'}
              </span>
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Unlock className="w-3 h-3" />
              <span>Unlocked</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized registry of all family members. The whole application and Family Documents TAG dropdown strictly consider only this list.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddFormOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Person</span>
          </button>

          <button
            type="button"
            onClick={onLock}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Lock this section immediately"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Lock Section</span>
          </button>
        </div>
      </div>

      {/* Add Person Inline Drawer / Form */}
      {isAddFormOpen && (
        <form
          onSubmit={handleCreatePerson}
          className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              <span>Register New Person in Vault</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (addError) setAddError('');
                }}
                placeholder="e.g. Ganesh, Priya, Grandpa"
                className="w-full text-xs bg-white px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Relationship / Role (Optional)
              </label>
              <input
                type="text"
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
                placeholder="e.g. Self, Spouse, Child, Parent"
                className="w-full text-xs bg-white px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g. Primary earner, NRI status"
                className="w-full text-xs bg-white px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {addError && (
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{addError}</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(false)}
              className="px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
            >
              Save Person
            </button>
          </div>
        </form>
      )}

      {/* People Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">
            Registered People ({people.length})
          </div>
          <div className="text-[11px] text-slate-500">
            Click pencil to rename person across all documents
          </div>
        </div>

        {people.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No People Added Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your family members using &quot;Add Person&quot; above, or add them directly via the person dropdown in the Family Documents tab.
            </p>
            <button
              type="button"
              onClick={() => setIsAddFormOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Person</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Person Name</th>
                  <th className="py-2.5 px-3">Relationship / Role</th>
                  <th className="py-2.5 px-3">Linked Family Documents</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((person, index) => {
                  const isEditing = editingPersonId === person.id;
                  const docCount = getDocCountForPerson(person.name);

                  if (isEditing) {
                    return (
                      <tr key={person.id} className="bg-indigo-50/40">
                        <td className="py-2 px-3 text-center text-slate-400 font-mono font-bold">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            autoFocus
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              if (editError) setEditError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(person);
                              if (e.key === 'Escape') setEditingPersonId(null);
                            }}
                            className="w-full text-xs font-semibold text-slate-900 bg-white px-2 py-1 border border-indigo-400 rounded-md outline-none"
                          />
                          {editError && (
                            <p className="text-[10px] text-rose-600 mt-0.5">{editError}</p>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editRelationship}
                            onChange={(e) => setEditRelationship(e.target.value)}
                            placeholder="Relationship"
                            className="w-full text-xs text-slate-700 bg-white px-2 py-1 border border-slate-300 rounded-md outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono">
                          {docCount} {docCount === 1 ? 'doc' : 'docs'}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes"
                            className="w-full text-xs text-slate-700 bg-white px-2 py-1 border border-slate-300 rounded-md outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(person)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Save changes (Enter)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPersonId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                              title="Cancel (Esc)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={person.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {person.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span>{person.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {person.relationship || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {docCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => onNavigateToPersonDocs?.(person.name)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                            title={`Filter Family Documents for ${person.name}`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>{docCount} Document{docCount === 1 ? '' : 's'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">0 Documents</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {person.notes || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(person)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit person name / info"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPersonToDelete(person)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete person (Requires password unlock)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {personToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Delete &quot;{personToDelete.name}&quot; from People List?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This person will be permanently removed from the master registry and will no longer appear in the document person dropdown or filters.
                </p>
                {getDocCountForPerson(personToDelete.name) > 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Notice: <strong>{getDocCountForPerson(personToDelete.name)} document(s)</strong> are currently assigned to this person. Deleting them will unassign this tag from those documents.
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel / Keep
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                Yes, Delete Person
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
