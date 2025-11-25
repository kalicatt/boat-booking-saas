'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface QuickBookingModalProps {
    slotStart: Date;     // L'heure sur laquelle on a cliqué
    boatId: number;      // Le bateau (colonne) sur lequel on a cliqué
    resources: any[];    // Liste des bateaux pour afficher le nom
    onClose: () => void;
    onSuccess: () => void;
}

const PRICE_ADULT = 9;
const PRICE_CHILD = 4;

export default function QuickBookingModal({ slotStart, boatId, resources, onClose, onSuccess }: QuickBookingModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    // États du formulaire
    const [time, setTime] = useState(format(slotStart, 'HH:mm')); // Pré-rempli avec le clic
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    
    // Détail passagers
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [babies, setBabies] = useState(0);

    // Infos calculées
    const totalPeople = adults + children + babies;
    const totalPrice = (adults * PRICE_ADULT) + (children * PRICE_CHILD);
    
    // Recherche du bateau cible
    const targetBoat = resources.find(r => r.id === boatId);

    // Nom affiché par défaut si l'employé ne rentre rien
    const defaultName = 'Client Guichet'; 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalPeople === 0) return alert("Il faut au moins 1 passager.");

        setIsLoading(true);

        // --- CORRECTION TIMEZONE (Fuseau Horaire) ---
        const [hours, minutes] = time.split(':').map(Number);
        const selectedDate = new Date(slotStart);
        selectedDate.setHours(hours);
        selectedDate.setMinutes(minutes);
        selectedDate.setSeconds(0);

        const isoString = selectedDate.toISOString();
        const dateUTC = isoString.split('T')[0];
        const timeUTC = isoString.split('T')[1].substring(0, 5); 

        // Nom exact à envoyer à la base de données
        const finalFirstName = firstName.trim() || 'Client';
        const finalLastName = lastName.trim() || 'Guichet';

        const bookingData = {
            date: dateUTC, // Date UTC
            time: timeUTC, // Heure UTC
            adults, 
            children, 
            babies,
            people: totalPeople,
            language: 'FR', 
            userDetails: {
                // On s'assure d'envoyer la bonne valeur
                firstName: finalFirstName, 
                lastName: finalLastName,
                email: 'guichet@sweet-narcisse.com', 
                phone: ''
            },
            forcedBoatId: boatId 
        };

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...bookingData, isStaffOverride: true })
            });

            if (res.ok) {
                onSuccess(); // Ferme et rafraîchit
            } else {
                const err = await res.json();
                alert(`Erreur: ${err.error}`);
            }
        } catch (e) {
            alert("Erreur de connexion.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="bg-blue-900 p-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-white font-bold text-lg">Ajout Rapide</h3>
                        {/* Affichage du nom du bateau ou d'un fallback */}
                        <p className="text-blue-200 text-xs">Sur {targetBoat ? targetBoat.title : `Barque ${boatId}`}</p>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white text-2xl font-bold">×</button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    
                    {/* 1. HORAIRE */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 mb-1">HORAIRE DE DÉPART</label>
                            <input 
                                type="time" 
                                value={time} 
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full text-xl font-bold text-blue-900 border-b-2 border-blue-200 focus:border-blue-600 outline-none p-1"
                            />
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold text-slate-500">DATE</span>
                            <span className="font-bold text-slate-700">{format(slotStart, 'dd/MM/yyyy')}</span>
                        </div>
                    </div>

                    {/* 2. CLIENT */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">NOM</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Nom"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full border rounded p-2 bg-slate-50"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">PRÉNOM</label>
                            <input 
                                type="text" 
                                placeholder="Prénom"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full border rounded p-2 bg-slate-50"
                            />
                        </div>
                    </div>

                    {/* 3. PASSAGERS (Compteurs) */}
                    <div className="bg-slate-100 rounded-lg p-3 space-y-2">
                        {/* ADULTES */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Adultes (9€)</span>
                            <div className="flex items-center bg-white rounded border">
                                <button type="button" onClick={() => setAdults(Math.max(0, adults - 1))} className="px-3 py-1 hover:bg-slate-100">-</button>
                                <span className="w-8 text-center font-bold">{adults}</span>
                                <button type="button" onClick={() => setAdults(adults + 1)} className="px-3 py-1 hover:bg-slate-100">+</button>
                            </div>
                        </div>

                        {/* ENFANTS */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Enfants (4€)</span>
                            <div className="flex items-center bg-white rounded border">
                                <button type="button" onClick={() => setChildren(Math.max(0, children - 1))} className="px-3 py-1 hover:bg-slate-100">-</button>
                                <span className="w-8 text-center font-bold">{children}</span>
                                <button type="button" onClick={() => setChildren(children + 1)} className="px-3 py-1 hover:bg-slate-100">+</button>
                            </div>
                        </div>

                        {/* BÉBÉS */}
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-700">Bébés (Gratuit)</span>
                            <div className="flex items-center bg-white rounded border">
                                <button type="button" onClick={() => setBabies(Math.max(0, babies - 1))} className="px-3 py-1 hover:bg-slate-100">-</button>
                                <span className="w-8 text-center font-bold">{babies}</span>
                                <button type="button" onClick={() => setBabies(babies + 1)} className="px-3 py-1 hover:bg-slate-100">+</button>
                            </div>
                        </div>
                    </div>

                    {/* 4. FOOTER & PRIX */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100 mt-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 uppercase font-bold">À Encaisser</span>
                            <span className="text-2xl font-bold text-green-600">{totalPrice} €</span>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading || totalPeople === 0}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-green-700 transition transform active:scale-95"
                        >
                            {isLoading ? "..." : "VALIDER ✅"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}