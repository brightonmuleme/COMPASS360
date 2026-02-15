"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSchoolData, FeaturedSchool } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Upload, User, MapPin, BookOpen, Send, Calendar, Phone, Mail, FileText } from 'lucide-react';

export default function SchoolApplicationPage() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params?.schoolId as string;

    const { featuredSchools, addSchoolApplication, submitSchoolApplication } = useSchoolData();
    const [school, setSchool] = useState<FeaturedSchool | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;
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

    useEffect(() => {
        if (!schoolId) return;
        const found = featuredSchools.find(s => String(s.id) === String(schoolId));
        if (found) {
            setSchool(found);
            setNotFound(false);
        } else {
            const timer = setTimeout(() => { if (!school) setNotFound(true); }, 1000);
            return () => clearTimeout(timer);
        }
    }, [schoolId, featuredSchools, school]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'results') => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) return alert('JPG/PNG only.');
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'profile') setProfilePhoto(reader.result as string);
                else setAcademicResults(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.dob || !formData.gender || !formData.nationality) return false;
        }
        if (step === 2) {
            if (!formData.phone || !formData.email || !formData.address || !formData.nokName || !formData.nokPhone) return false;
        }
        if (step === 3) {
            if (!formData.highestQualification || !formData.lastInstitution || !formData.programmes) return false;
        }
        return true;
    }

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Please fill in all required fields to proceed.");
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
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
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality jpeg
            };
        });
    };

    const handleSubmit = async () => {
        if (!formData.agreed) return alert("Please agree to the declaration.");
        setSubmitting(true);

        try {
            // Compress images before sending to save storage
            const optimizedPhoto = profilePhoto ? await compressImage(profilePhoto, 400, 400) : undefined;
            const optimizedResults = academicResults ? await compressImage(academicResults, 1000, 1000) : undefined;

            // Use the new Cloud-First submission
            await (submitSchoolApplication as any)({
                schoolId: school!.id,
                schoolName: school!.name,
                applicantName: `${formData.firstName} ${formData.lastName}`,
                applicantEmail: formData.email,
                applicantPhone: formData.phone,
                profilePhoto: optimizedPhoto,
                academicResults: optimizedResults,
                ...formData
            });

            setSubmitting(false);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error("Submission failed:", err);
            setSubmitting(false);
            alert("External Sync Failed. Please check your internet and try again.");
        }
    };

    if (notFound) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center p-8">School Not Found <Link href="/" className="text-blue-600 block mt-4">Go Home</Link></div></div>;
    if (!school) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Loading...</div>;

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-12 rounded-3xl shadow-xl max-w-2xl w-full text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={48} strokeWidth={3} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-4">Application Sent!</h1>
                    <p className="text-lg text-slate-600 mb-8">
                        Your application to <strong>{school.name}</strong> has been received. <br />
                        We will contact you via email ({formData.email}) shortly.
                    </p>
                    <button onClick={() => router.push('/')} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition">
                        Return to Schools
                    </button>
                </div>
            </div>
        );
    }

    // Styles
    const inputClass = "w-full p-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 focus:shadow-sm outline-none transition-all duration-300 text-slate-900 font-medium placeholder:text-slate-300";
    const labelClass = "block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1";

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

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-[2rem] bg-white border border-slate-100 p-3 shadow-2xl shadow-slate-200/50 flex-shrink-0 flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-blue-600/5 rounded-[2rem] scale-0 group-hover:scale-100 transition-transform duration-500" />
                            {school.logo ? <img src={school.logo} alt="" className="max-w-full max-h-full object-contain relative z-10" /> : <div className="text-3xl font-black text-slate-200 relative z-10">{school.name[0]}</div>}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-200">{school.category}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrolling for 2026</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-2">{school.name}</h1>
                            <p className="text-slate-500 font-semibold text-lg max-w-xl leading-relaxed italic opacity-80">"{school.tagline}"</p>
                        </div>
                    </div>
                </div>

                {/* Gallery Showcase - Bento Box Style */}
                {school.gallery && school.gallery.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14 h-[300px] md:h-[450px]">
                        <div className="col-span-2 row-span-2 relative rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 group cursor-pointer border-4 border-white">
                            <img src={school.gallery[0] || school.image} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        {school.gallery.slice(1, 3).map((img, idx) => (
                            <div key={idx} className="relative rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 group cursor-pointer border-4 border-white h-full">
                                <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        ))}
                        <div className="relative rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 bg-slate-900 flex flex-col items-center justify-center p-6 text-center border-4 border-white group cursor-pointer">
                            <img src={school.gallery[3] || school.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative z-10">
                                <p className="text-white font-black text-xs uppercase tracking-widest mb-1">View All</p>
                                <p className="text-white/60 text-[10px] font-bold">12+ Photos</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/30 mb-16 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
                    <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 relative z-10">Introduction</h3>
                    <p className="text-slate-600 leading-relaxed font-semibold text-lg relative z-10">{school.description}</p>
                    {school.location && (
                        <div className="flex items-center gap-3 mt-6 text-slate-400 font-black text-xs uppercase tracking-widest relative z-10">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-blue-500">
                                <MapPin size={14} />
                            </div>
                            {school.location}
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-12 items-start">

                {/* Sidebar Progress (Desktop) */}
                <div className="hidden lg:block sticky top-8">
                    <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-white shadow-xl shadow-slate-200/20">
                        <div className="space-y-8">
                            {[
                                { num: 1, label: "Personal Info", icon: User },
                                { num: 2, label: "Contact Details", icon: Phone },
                                { num: 3, label: "Academic History", icon: BookOpen },
                                { num: 4, label: "Review & Submit", icon: Send },
                            ].map((step) => {
                                const isActive = currentStep === step.num;
                                const isCompleted = currentStep > step.num;

                                return (
                                    <div key={step.num} className={`flex items-center gap-5 transition-all duration-500 ${isActive ? 'translate-x-2' : ''}`}>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-lg shrink-0
                                            ${isActive ? 'bg-blue-600 text-white shadow-blue-200 rotate-6 scale-110' :
                                                isCompleted ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-white text-slate-300 border border-slate-100 shadow-slate-50'}`}>
                                            {isCompleted ? <Check size={20} strokeWidth={3} /> : <step.icon size={20} strokeWidth={isActive ? 3 : 2} />}
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest leading-none mb-1 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>Step 0{step.num}</p>
                                            <span className={`font-black text-sm tracking-tight ${isActive ? 'text-slate-900' : 'text-slate-400 opacity-60'}`}>{step.label}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100/50">
                            <div className="flex items-center gap-3 text-slate-400">
                                <FileText size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Secured Admission</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Form Area */}
                <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-8 md:p-14 relative overflow-hidden border border-slate-50">
                    {/* Visual Decorations */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 blur-3xl -mr-16 -mt-16 rounded-full" />

                    {/* Mobile Progress Bar */}
                    <div className="lg:hidden mb-12">
                        <div className="flex justify-between items-end mb-3 px-1">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">In Progress</p>
                                <h3 className="text-xl font-black text-slate-900">Step {currentStep} of {totalSteps}</h3>
                            </div>
                            <span className="text-2xl font-black text-blue-600">{Math.round((currentStep / totalSteps) * 100)}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-700 shadow-sm shadow-blue-200" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
                        </div>
                    </div>

                    <div className="mb-12 relative z-10">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                            {currentStep === 1 && "Start your journey"}
                            {currentStep === 2 && "Permanent contact"}
                            {currentStep === 3 && "Academic background"}
                            {currentStep === 4 && "Final verification"}
                        </h2>
                        <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em]">
                            {currentStep === 1 && "Personal identification & bio-data"}
                            {currentStep === 2 && "How should the institution reach you?"}
                            {currentStep === 3 && "Previous achievements & qualifications"}
                            {currentStep === 4 && "Review your details for accuracy"}
                        </p>
                    </div>

                    {/* Step 1: Personal Info */}
                    {currentStep === 1 && (
                        <div className="space-y-10 animation-slide-up relative z-10">
                            {/* Photo Upload */}
                            <div className="flex flex-col items-center mb-10">
                                <div onClick={() => profileInputRef.current?.click()}
                                    className="relative w-40 h-40 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all duration-500 overflow-hidden group shadow-inner">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all mx-auto mb-3 border border-slate-100">
                                                <Upload size={20} />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attach Photo</span>
                                        </div>
                                    )}
                                    <input type="file" ref={profileInputRef} onChange={(e) => handleImageChange(e, 'profile')} className="hidden" accept="image/*" />
                                </div>
                                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passport size photo preferred</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                <div><label className={labelClass}>First Name *</label><input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} placeholder="Legal first name" /></div>
                                <div><label className={labelClass}>Last Name *</label><input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} placeholder="Family name" /></div>
                                <div><label className={labelClass}>Middle Name</label><input type="text" value={formData.middleName} onChange={e => setFormData({ ...formData, middleName: e.target.value })} className={inputClass} placeholder="Optional initials" /></div>
                                <div><label className={labelClass}>Date of Birth *</label><input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className={inputClass} /></div>
                                <div>
                                    <label className={labelClass}>Gender *</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inputClass}>
                                        <option value="">Select gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div><label className={labelClass}>Nationality *</label><input type="text" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={inputClass} placeholder="Country of origin" /></div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact */}
                    {currentStep === 2 && (
                        <div className="space-y-10 animation-slide-up relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                <div className="md:col-span-2"><label className={labelClass}>Home Address *</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputClass} placeholder="District, Village, Plot No. or Residence" /></div>
                                <div><label className={labelClass}>Phone Number *</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+256 000 000 000" /></div>
                                <div><label className={labelClass}>Email Address *</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="personal@email.com" /></div>
                            </div>

                            <div className="pt-12 mt-4 border-t border-slate-100 relative">
                                <div className="absolute top-0 left-0 bg-white px-4 -translate-y-1/2">
                                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest italic group-hover:translate-x-1 transition-transform">
                                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" /> Next of Kin
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 mt-6">
                                    <div><label className={labelClass}>Full Name *</label><input type="text" value={formData.nokName} onChange={e => setFormData({ ...formData, nokName: e.target.value })} className={inputClass} placeholder="Guardian / Parent name" /></div>
                                    <div><label className={labelClass}>Relationship *</label><input type="text" value={formData.nokRelationship} onChange={e => setFormData({ ...formData, nokRelationship: e.target.value })} className={inputClass} placeholder="e.g. Mother, Father, Aunt" /></div>
                                    <div><label className={labelClass}>Secondary Phone *</label><input type="tel" value={formData.nokPhone} onChange={e => setFormData({ ...formData, nokPhone: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>Kin Address</label><input type="text" value={formData.nokAddress} onChange={e => setFormData({ ...formData, nokAddress: e.target.value })} className={inputClass} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Academics */}
                    {currentStep === 3 && (
                        <div className="space-y-10 animation-slide-up relative z-10">
                            <div>
                                <label className={labelClass}>Desired Programme of Study *</label>
                                <input type="text" value={formData.programmes} onChange={e => setFormData({ ...formData, programmes: e.target.value })} className={inputClass} placeholder="e.g. Bachelor of Science in Information Tech" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
                                <div><label className={labelClass}>Highest Qualification *</label><input type="text" value={formData.highestQualification} onChange={e => setFormData({ ...formData, highestQualification: e.target.value })} className={inputClass} placeholder="Level of previous education" /></div>
                                <div><label className={labelClass}>Previous Institution *</label><input type="text" value={formData.lastInstitution} onChange={e => setFormData({ ...formData, lastInstitution: e.target.value })} className={inputClass} placeholder="Name of school attended" /></div>
                                <div><label className={labelClass}>Completion Year</label><input type="text" value={formData.completionYear} onChange={e => setFormData({ ...formData, completionYear: e.target.value })} className={inputClass} placeholder="YYYY" /></div>
                                <div>
                                    <label className={labelClass}>Study Arrangement</label>
                                    <select value={formData.modeOfStudy} onChange={e => setFormData({ ...formData, modeOfStudy: e.target.value })} className={inputClass}>
                                        <option>Full-time Residence</option>
                                        <option>Part-time / Weekend</option>
                                        <option>Distance Learning</option>
                                    </select>
                                </div>
                            </div>

                            {/* Documents */}
                            <div>
                                <label className={labelClass}>Supporting Academic Documents *</label>
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center text-center cursor-pointer hover:bg-blue-50/50 hover:border-blue-500/50 transition-all duration-500 group shadow-inner mt-2"
                                    onClick={() => resultsInputRef.current?.click()}>
                                    {academicResults ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 animate-in zoom-in duration-500">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 text-lg leading-none mb-2 tracking-tight">Academic File Ready</h4>
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Click to update attachment</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 rounded-[1.25rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all mb-4">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-black text-slate-800 text-lg mb-1 tracking-tight">Upload Transcripts / Result Slips</h4>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 opacity-60">High Resolution Scans (Max 5MB)</p>
                                        </>
                                    )}
                                    <input type="file" ref={resultsInputRef} onChange={e => handleImageChange(e, 'results')} className="hidden" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Final */}
                    {currentStep === 4 && (
                        <div className="space-y-10 animation-slide-up relative z-10">
                            <div className="bg-slate-50/80 backdrop-blur-sm p-8 rounded-[2rem] border border-white shadow-inner">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Brief Overview</h3>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Full Name</span>
                                        <span className="font-black text-slate-900 uppercase tracking-tighter italic">{formData.firstName} {formData.lastName}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Phone</span>
                                        <span className="font-black text-slate-900">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Course</span>
                                        <span className="font-black text-slate-900 text-right max-w-[200px] leading-tight">{formData.programmes}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Marketing Survey</label>
                                <select value={formData.sourceOfInfo} onChange={e => setFormData({ ...formData, sourceOfInfo: e.target.value })} className={inputClass}>
                                    <option value="">How did you discover us?</option>
                                    <option>Official Social Media</option>
                                    <option>Recommendation (Word of Mouth)</option>
                                    <option>Radio or Television Broadcast</option>
                                    <option>Institutional Field Visit</option>
                                    <option>Newspaper / Printed Ads</option>
                                </select>
                            </div>

                            <label className="flex items-start gap-5 p-6 bg-blue-600 text-white rounded-[2rem] cursor-pointer shadow-xl shadow-blue-200 transition-all hover:scale-[1.01] hover:shadow-2xl">
                                <div className="mt-1 flex-shrink-0">
                                    <input type="checkbox" checked={formData.agreed} onChange={e => setFormData({ ...formData, agreed: e.target.checked })}
                                        className="w-6 h-6 rounded-lg bg-blue-500 border-none focus:ring-offset-blue-600 accent-white" />
                                </div>
                                <span className="text-xs font-bold leading-relaxed opacity-90">
                                    By checking this box, I solemnly declare that all information entered is accurate to the best of my knowledge. I understand that any deliberate misrepresentation may result in instant revocation of my admission status.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Nav Actions */}
                    <div className="flex justify-between items-center mt-12 pt-10 border-t border-slate-100 relative z-10">
                        {currentStep > 1 ? (
                            <button onClick={prevStep}
                                className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                                Previous Step
                            </button>
                        ) : <div />}

                        <div className="flex items-center gap-4">
                            {currentStep < totalSteps ? (
                                <button onClick={nextStep}
                                    className="bg-slate-900 hover:bg-black text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)] hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(15,23,42,0.4)] group">
                                    Continue <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={!formData.agreed || submitting}
                                    className={`bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all duration-300 shadow-[0_20px_40px_-10px_rgba(37,99,235,0.3)] hover:-translate-y-1 hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.4)] ${(!formData.agreed || submitting) ? 'opacity-50 cursor-not-allowed scale-95 shadow-none' : ''}`}>
                                    {submitting ? 'Verifying...' : 'Submit Application'} <Send size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animation-slide-up {
                    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                /* Custom Scrollbar */
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #f8fafc;
                }
                ::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
