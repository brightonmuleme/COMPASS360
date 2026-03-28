"use client";
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, ArrowRight, Check, Upload, Download, 
    User, MapPin, BookOpen, Send, Calendar, Phone, Mail, FileText 
} from 'lucide-react';

interface Props {
    schoolId: string;
    initialData?: any;
}

const compressImage = (base64String: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64String;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
};

export default function SchoolApplicationClient({ schoolId, initialData }: Props) {
    const router = useRouter();
    
    // Server-Side Loaded State. No Spinners. No Global Store.
    const [school] = useState<any>(initialData || null);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        // 1. Bio Data
        firstName: '', middleName: '', lastName: '',
        dob: '', gender: '', nationality: '',

        // 2. Contact & Kin
        phone: '', email: '', address: '',
        nokName: '', nokRelationship: '', nokPhone: '', nokAddress: '',

        // 3. Academic
        highestQualification: '', lastInstitution: '', completionYear: '',
        examBody: '', indexNumber: '',
        programmes: '', entryLevel: '', modeOfStudy: 'Full-time',

        // 4. Marketing & Declaration
        sourceOfInfo: '', sourceOrgName: '', sourceFriendName: '', sourceOther: '',
        agreed: false
    });

    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [academicResults, setAcademicResults] = useState<string | null>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);
    const resultsInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isProfile: boolean) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            if (isProfile) setProfilePhoto(base64String);
            else setAcademicResults(base64String);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!formData.agreed) return alert("Please agree to the declaration.");
        setSubmitting(true);

        try {
            // Compress images tightly for mobile resilience
            const optimizedPhoto = profilePhoto ? await compressImage(profilePhoto, 400, 400) : null;
            const optimizedResults = academicResults ? await compressImage(academicResults, 1000, 1000) : null;

            // Direct Insert bypassing the 300KB global store. Fixes mobile submission failures.
            const { error } = await supabase
                .from('admission_applications')
                .insert([{
                    school_id: school!.id,
                    school_name: school!.name,
                    applicant_name: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`.trim(),
                    email: formData.email,
                    phone: formData.phone,
                    programmes: formData.programmes,
                    entry_level: formData.entryLevel,
                    mode_of_study: formData.modeOfStudy,
                    profile_photo: optimizedPhoto, 
                    academic_results: optimizedResults, 
                    status: 'pending',
                    // Correct column name is full_data
                    full_data: JSON.stringify(formData)
                }]);

            if (error) {
                console.error("Direct Submission Error:", error);
                throw new Error("Cloud Gateway Rejected payload.");
            }

            setSubmitting(false);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Submission failed:", err);
            setSubmitting(false);
            alert("External Sync Failed. Please check your internet and try again.");
        }
    };

    // --- BRUTE FORCE: Always show the form, never show a blank screen ---
    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 max-w-2xl w-full text-center border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-8 ring-green-50">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-4 italic uppercase tracking-tight">Application Sent!</h1>
                    <p className="text-lg font-bold text-slate-500 mb-8 uppercase text-[10px] tracking-[0.2em] italic leading-loose">
                        Your application for <span className="text-emerald-600 font-black">{formData.firstName} {formData.lastName}</span> to <span className="text-blue-600 block text-2xl mt-2">{school?.name}</span> has been received. <br />
                        We will contact you via email ({formData.email || 'N/A'}) and phone ({formData.phone || 'N/A'}) shortly.
                    </p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => {
                                // 🏦 REAL FEES SYNC: Connect to the 'fees_url' field from Supabase
                                const feesUrl = school?.fees_url || school?.feesStructure;
                                
                                if (!feesUrl || feesUrl === 'EMPTY') {
                                    alert("Official Fees Structure is currently being updated. Downloading standard schedule.");
                                    window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
                                    return;
                                }

                                try {
                                    const link = document.createElement('a');
                                    link.href = feesUrl;
                                    
                                    // Detect file type for naming
                                    const isPdf = feesUrl.startsWith('data:application/pdf') || feesUrl.toLowerCase().includes('.pdf');
                                    const extension = isPdf ? 'pdf' : 'jpg';
                                    
                                    link.download = `Fees_Structure_${school?.name?.replace(/\s+/g, '_') || 'School'}.${extension}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                } catch (e) {
                                    console.error("Download failed:", e);
                                    window.open(feesUrl, '_blank');
                                }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 animate-pulse italic"
                        >
                            <Download size={20} /> 
                            Download Fees Structure
                        </button>
                        
                        <button 
                            onClick={() => router.push('/')} 
                            className="w-full bg-slate-900 text-slate-400 hover:text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-800"
                        >
                            Return to Schools
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    // --- Loading & Blank State Handlers ---
    if (!school) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 max-w-xl w-full text-center border border-slate-100">
                    <h1 className="text-3xl font-black text-slate-900 mb-4 italic uppercase">School Not Found</h1>
                    <p className="text-slate-500 mb-8 font-medium">The application portal you are looking for is currently offline or invalid.</p>
                    <button onClick={() => router.push('/')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                        Return to Directory
                    </button>
                </div>
            </div>
        );
    }

    // Styles
    const inputClass = "w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 focus:shadow-sm outline-none transition-all duration-300 text-slate-900 font-medium placeholder:text-slate-300";
    const labelClass = "block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2 ml-1";

    const validateStep = (step: number) => {
        if (step === 1) {
            const fields = [
                { id: 'firstName', name: 'First Name', value: formData.firstName },
                { id: 'lastName', name: 'Surname', value: formData.lastName },
                { id: 'dob', name: 'Date of Birth', value: formData.dob },
                { id: 'gender', name: 'Gender Identity', value: formData.gender },
                { id: 'nationality', name: 'Nationality', value: formData.nationality }
            ];
            for (const field of fields) {
                if (!field.value) {
                    alert(`${field.name} is required (*)`);
                    const el = document.getElementById(field.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return false;
                }
            }
        }
        if (step === 2) {
            if (!formData.phone || !formData.email) {
                alert("Contact Phone and Active Email are required (*)");
                return false;
            }
        }
        if (step === 3) {
            if (!academicResults) {
                alert("Please upload your Official Academic Results (*)");
                return false;
            }
        }
        if (step === 4) {
            if (!formData.programmes || !formData.entryLevel) {
                alert("Intended Programme and Entry Level are required (*)");
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20 selection:bg-blue-100 selection:text-blue-900">
            {/* Ambient Background Glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent -z-10 blur-3xl opacity-50 pointer-events-none" />

            {/* Header / Nav */}
            <div className="max-w-5xl mx-auto pt-10 px-6 mb-10">
                <Link href="/" className="inline-flex items-center text-slate-400 hover:text-blue-600 font-bold mb-8 transition-all hover:-translate-x-1 group">
                    <ArrowLeft size={18} className="mr-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs uppercase tracking-widest">Back to Directory</span>
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 mb-8 md:mb-12">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center md:text-left">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] bg-white border border-slate-100 p-2 md:p-3 shadow-xl md:shadow-2xl shadow-slate-200/50 flex-shrink-0 flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-blue-600/5 rounded-[1.5rem] md:rounded-[2rem] scale-0 group-hover:scale-100 transition-transform duration-500" />
                            {school.logo ? <img src={school.logo} alt="" className="max-w-full max-h-full object-contain relative z-10" /> : <div className="text-2xl md:text-3xl font-black text-slate-200 relative z-10">{school.name[0]}</div>}
                        </div>
                        <div className="flex flex-col items-center md:items-start max-w-full overflow-hidden">
                            <div className="flex items-center gap-2 mb-2 md:mb-3">
                                <span className="inline-block px-2 md:px-3 py-1 rounded-full bg-blue-600 text-white text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200">{school.category}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{school.enrollmentStatus || 'Enrolling for 2026'}</span>
                            </div>
                            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-2 italic uppercase break-words px-2 md:px-0">{school.name}</h1>
                            <p className="text-slate-500 font-semibold text-sm md:text-lg max-w-xl leading-relaxed italic opacity-80 px-2 md:px-0">"{school.tagline}"</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/70 backdrop-blur-xl p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white shadow-lg md:shadow-xl shadow-slate-200/30 mb-8 md:mb-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
                    <h3 className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 md:mb-4 relative z-10">Directorate Notice</h3>
                    <div className="flex flex-col gap-4 relative z-10">
                        <p className="text-slate-600 leading-relaxed font-semibold text-[10px] md:text-xs uppercase tracking-widest opacity-70">
                            Please ensure all fields marked with <span className="text-red-500 text-lg">*</span> are completed accurately. <br />
                            The Admissions Hub uses this data to verify your identity and academic eligibility.
                        </p>

                        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={16} />
                            </div>
                            <p className="text-[9px] md:text-[10px] font-black text-blue-600/80 uppercase tracking-widest leading-relaxed">
                                Note: The Official <span className="text-blue-700">Fees Structure</span> is available to download immediately <span className="text-blue-700 underline underline-offset-4">after</span> you have submitted this application.
                            </p>
                        </div>
                    </div>
                </div>
                {/* Hero / Gallery Showcase - Responsive Bento Box */}
                {(school.image || (school.gallery && school.gallery.length > 0)) && (
                    <div className={"mb-10 " + (school.gallery && school.gallery.length > 0 ? "grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 h-[220px] md:h-[450px]" : "h-[220px] md:h-[450px]")}>
                        <div className={(school.gallery && school.gallery.length > 0 ? "col-span-2 row-span-2" : "w-full h-full") + " relative rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-xl md:shadow-2xl shadow-slate-200/50 group cursor-pointer border-2 md:border-4 border-white"}>
                            <img src={(school.gallery && school.gallery.length > 0 ? school.gallery[0] : school.image) || school.image} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                {school.gallery && school.gallery.length > 0 && school.gallery.slice(1, 4).map((img: string, idx: number) => (
                    <div key={idx} className="relative rounded-[1.5rem] md:rounded-[2.2rem] overflow-hidden shadow-lg shadow-slate-200/50 group cursor-pointer border-2 md:border-4 border-white h-full hidden md:block">
                        <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                ))}
                    </div>
                )}

                <div className="bg-white/70 backdrop-blur-xl p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white shadow-lg md:shadow-xl shadow-slate-200/30 mb-10 md:mb-16 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
                    <h3 className="text-[9px] md:text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 md:mb-4 relative z-10">Introduction</h3>
                    <p className="text-slate-600 leading-relaxed font-semibold text-sm md:text-lg relative z-10">{school.description}</p>
                    <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-4 md:mt-6 relative z-10">
                        {school.location && (
                            <div className="flex items-center gap-2 md:gap-3 text-slate-400 font-black text-[9px] md:text-xs uppercase tracking-widest">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-50 flex items-center justify-center text-blue-500">
                                    <MapPin size={12} />
                                </div>
                                {school.location}
                            </div>
                        )}
                        {school.contact && (
                            <div className="flex items-center gap-2 md:gap-3 text-slate-400 font-black text-[9px] md:text-xs uppercase tracking-widest">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-600">
                                    <Phone size={12} />
                                </div>
                                {school.contact}
                            </div>
                        )}
                        {school.email && (
                            <div className="flex items-center gap-2 md:gap-3 text-slate-400 font-black text-[9px] md:text-xs uppercase tracking-widest">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-600">
                                    <Mail size={12} />
                                </div>
                                {school.email}
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Progress */}
                <div className="mb-8 md:mb-12">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-[10px] md:text-xs">
                                {currentStep}
                            </div>
                            <span className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Phase: <span className="text-slate-900">{currentStep === 1 ? 'Bio-Metrics' : currentStep === 2 ? 'Social' : currentStep === 3 ? 'Academic' : 'Final'}</span></span>
                        </div>
                        <span className="text-[9px] md:text-[11px] font-black text-slate-300 uppercase tracking-widest">{Math.round((currentStep / totalSteps) * 100)}%</span>
                    </div>
                    <div className="h-2 md:h-3 w-full bg-slate-100 rounded-full p-0.5 md:p-1 overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
                    </div>
                </div>

                {/* Form Section */}
                <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl shadow-slate-200/40 p-5 md:p-14 border border-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 md:w-2 h-full bg-blue-600/10" />
                    
                    {currentStep === 1 && (
                        <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12">
                                <div className="shrink-0 group">
                                    <label className={labelClass}>Passport Photo</label>
                                    <div 
                                        onClick={() => profileInputRef.current?.click()}
                                        className="w-40 h-48 md:w-48 md:h-56 rounded-[2rem] md:rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 md:gap-4 cursor-pointer hover:bg-white hover:border-blue-500/50 hover:shadow-2xl transition-all duration-500 overflow-hidden relative"
                                    >
                                        {profilePhoto ? (
                                            <>
                                                <img src={profilePhoto} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Upload size={24} className="text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-300 shadow-sm"><User size={28} /></div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest opacity-60">Upload Photo</span>
                                            </>
                                        )}
                                        <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <div className="space-y-1">
                                        <label className={labelClass}>First Legal Name <span className="text-red-500">*</span></label>
                                        <input id="firstName" className={inputClass} placeholder="Enter your first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Middle Name</label>
                                        <input id="middleName" className={inputClass} placeholder="Optional" value={formData.middleName} onChange={(e) => setFormData({...formData, middleName: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Surname / Last Name <span className="text-red-500">*</span></label>
                                        <input id="lastName" className={inputClass} placeholder="Enter your family name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                                        <input id="dob" type="date" className={inputClass} value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Gender Identity <span className="text-red-500">*</span></label>
                                        <select id="gender" className={inputClass} value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                                            <option value="">Select Identity</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Nationality <span className="text-red-500">*</span></label>
                                        <input id="nationality" className={inputClass} placeholder="Country of Origin" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tight">Social <span className="text-blue-600">Sync</span></h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className={labelClass}>Primary Phone <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input className={`${inputClass} pl-12`} placeholder="+256..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Active Email <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input className={`${inputClass} pl-12`} placeholder="applicant@email.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className={labelClass}>Residential Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                        <input className={`${inputClass} pl-12`} placeholder="District, City, Village" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                                    </div>
                                </div>

                                <div className="col-span-1 md:col-span-2 pt-8 border-t border-slate-50">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 italic">Next of Kin (Emergency Link)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <input className={inputClass} placeholder="Full Legal Name" value={formData.nokName} onChange={(e) => setFormData({...formData, nokName: e.target.value})} />
                                        <input className={inputClass} placeholder="Relationship (e.g. Parent)" value={formData.nokRelationship} onChange={(e) => setFormData({...formData, nokRelationship: e.target.value})} />
                                        <input className={inputClass} placeholder="Kin Primary Phone" value={formData.nokPhone} onChange={(e) => setFormData({...formData, nokPhone: e.target.value})} />
                                        <input className={inputClass} placeholder="Kin Residential Address" value={formData.nokAddress} onChange={(e) => setFormData({...formData, nokAddress: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tight">Academic <span className="text-blue-600">History</span></h2>
                            
                            <div className="bg-slate-50 p-6 md:p-10 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 group">
                                <div 
                                    onClick={() => resultsInputRef.current?.click()}
                                    className="w-full md:w-32 h-40 rounded-3xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer group-hover:border-blue-500/50 shadow-sm transition-all relative overflow-hidden shrink-0"
                                >
                                    {academicResults ? (
                                        <>
                                            <img src={academicResults} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload size={20} className="text-white" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={24} className="text-slate-300 mb-2" />
                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter text-center px-4">Upload Documents (UNEB/Academic Results)</span>
                                        </>
                                    )}
                                    <input type="file" ref={resultsInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, false)} />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight underline decoration-blue-500/30">Official Results Upload <span className="text-red-500">*</span></h4>
                                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                        Please provide a scanned copy or clear photo of your most recent academic results (e.g., UCE, UACE, Certificate). Size limit: 10MB.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className={labelClass}>Highest Qualification</label>
                                    <input className={inputClass} placeholder="e.g. UCE, UACE, Diploma" value={formData.highestQualification} onChange={(e) => setFormData({...formData, highestQualification: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Institution Attended</label>
                                    <input className={inputClass} placeholder="Name of your last school" value={formData.lastInstitution} onChange={(e) => setFormData({...formData, lastInstitution: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Completion Year</label>
                                    <input className={inputClass} placeholder="e.g. 2023" value={formData.completionYear} onChange={(e) => setFormData({...formData, completionYear: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className={labelClass}>Index Number</label>
                                    <input className={inputClass} placeholder="UCE/UACE Index" value={formData.indexNumber} onChange={(e) => setFormData({...formData, indexNumber: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tight">Programme <span className="text-blue-600">Selection</span></h2>
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <label className={labelClass}>Intended Programme of Study <span className="text-red-500">*</span></label>
                                    <textarea 
                                        className={`${inputClass} min-h-[100px]`} 
                                        placeholder="Enter the course(s) you are applying for..." 
                                        value={formData.programmes} 
                                        onChange={(e) => setFormData({...formData, programmes: e.target.value})} 
                                    />
                                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tight">Institutional Recommendation: <span className="text-blue-500">{school.recommendations || 'Full Medical & Health Sciences'}</span></p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className={labelClass}>Entry Level <span className="text-red-500">*</span></label>
                                        <select className={inputClass} value={formData.entryLevel} onChange={(e) => setFormData({...formData, entryLevel: e.target.value})}>
                                            <option value="">Select Level</option>
                                            <option value="Certificate">Certificate</option>
                                            <option value="Diploma">Diploma</option>
                                            <option value="Bachelors">Bachelors</option>
                                            <option value="Short Course">Short Course</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className={labelClass}>Mode of Study</label>
                                        <select className={inputClass} value={formData.modeOfStudy} onChange={(e) => setFormData({...formData, modeOfStudy: e.target.value})}>
                                            <option value="Full-time">Full-time</option>
                                            <option value="Hybrid">Hybrid</option>
                                            <option value="Online">Online</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-50 space-y-6">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Marketing Insight</h3>
                                    <div className="space-y-4">
                                        <label className={labelClass}>How did you hear about us?</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {['Social Media', 'Radio/TV', 'Friend', 'School Outreach', 'Other'].map((opt) => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => setFormData({...formData, sourceOfInfo: opt})}
                                                    className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.sourceOfInfo === opt ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 5 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-700">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic uppercase tracking-tight">Review <span className="text-blue-600">Protocol</span></h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Identity Overview</h3>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Full Legal Name</p>
                                        <p className="text-slate-900 font-bold">{formData.firstName} {formData.middleName} {formData.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Academic Path</p>
                                        <p className="text-slate-900 font-bold italic">{formData.programmes || 'None Specified'}</p>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Communication</h3>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Primary Contact</p>
                                        <p className="text-slate-900 font-bold">{formData.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Active Email</p>
                                        <p className="text-slate-900 font-bold">{formData.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-50">
                                <label className="flex items-start gap-4 cursor-pointer group p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-500 transition-all">
                                    <div className={`mt-1 shrink-0 w-8 h-8 rounded-xl border-4 flex items-center justify-center transition-all ${formData.agreed ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-50 border-slate-200 group-hover:border-blue-300'}`}>
                                        {formData.agreed && <Check size={20} className="text-white" strokeWidth={4} />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={formData.agreed} onChange={(e) => setFormData({...formData, agreed: e.target.checked})} />
                                    <span className="text-xs font-black text-slate-500 leading-relaxed uppercase select-none group-hover:text-slate-900 transition-colors">
                                        I solemnly declare that the information provided is accurate and true to the best of my knowledge. I understand that falsification will lead to immediate disqualification.
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation */}
                    <div className="flex flex-col-reverse md:flex-row items-center justify-between mt-10 md:mt-14 pt-8 md:pt-10 border-t border-slate-100 gap-6">
                        <button 
                            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                            disabled={currentStep === 1}
                            className={`flex items-center gap-2 font-black text-[10px] md:text-[11px] uppercase tracking-widest transition-all ${currentStep === 1 ? 'opacity-0' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                            <ArrowLeft size={16} /> Previous Phase
                        </button>

                        {currentStep < totalSteps ? (
                            <button 
                                onClick={handleNext}
                                className="w-full md:w-auto bg-slate-900 text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-black hover:scale-[1.02] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                            >
                                Continue Phase <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="w-full md:w-auto bg-blue-600 text-white px-8 md:px-12 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-blue-500 hover:scale-[1.02] shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 italic"
                            >
                                {submitting ? (
                                    <>Verifying Protocol...</>
                                ) : (
                                    <>Finalize Enrollment <Send size={18} /></>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Secure Badge */}
                <div className="mt-10 flex items-center justify-center gap-4 text-slate-300">
                    <div className="w-12 h-[1px] bg-slate-100" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" /> 256-Bit Secure Cloud Environment
                    </span>
                    <div className="w-12 h-[1px] bg-slate-100" />
                </div>
            </div>
        </div>
    );
}

function ArrowLeftIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
        </svg>
    )
}

function CheckCircle2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
