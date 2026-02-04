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

    const { featuredSchools, addSchoolApplication } = useSchoolData();
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

    const handleSubmit = async () => {
        if (!formData.agreed) return alert("Please agree to the declaration.");
        setSubmitting(true);

        addSchoolApplication({
            schoolId: school!.id,
            schoolName: school!.name,
            applicantName: `${formData.firstName} ${formData.lastName}`,
            applicantEmail: formData.email,
            applicantPhone: formData.phone,
            profilePhoto: profilePhoto || undefined,
            academicResults: academicResults || undefined,
            ...formData
        });

        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 1500);
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
    const inputClass = "w-full p-3 rounded-xl border border-slate-200 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-slate-900";
    const labelClass = "block text-sm font-bold text-slate-700 mb-1";

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header / Nav */}
            <div className="max-w-4xl mx-auto pt-8 px-4 mb-8">
                <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 font-bold mb-6 transition">
                    <ArrowLeft size={18} className="mr-2" /> Back to Schools
                </Link>

                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm flex-shrink-0">
                        <img src={school.logo} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{school.name} Admission</h1>
                        <p className="text-slate-500 font-medium">Academic Year 2026/2027</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">

                {/* Sidebar Progress (Desktop) */}
                <div className="hidden md:block sticky top-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                        <div className="space-y-6">
                            {[
                                { num: 1, label: "Personal Info", icon: User },
                                { num: 2, label: "Contact Details", icon: Phone },
                                { num: 3, label: "Academic History", icon: BookOpen },
                                { num: 4, label: "Review & Submit", icon: Send },
                            ].map((step) => (
                                <div key={step.num} className={`flex items-center gap-4 ${currentStep === step.num ? 'text-blue-600' : currentStep > step.num ? 'text-green-600' : 'text-slate-300'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 
                                        ${currentStep === step.num ? 'border-blue-600 bg-blue-50' : currentStep > step.num ? 'border-green-600 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                                        {currentStep > step.num ? <Check size={16} /> : step.num}
                                    </div>
                                    <span className={`font-bold ${currentStep === step.num ? 'text-slate-900' : ''}`}>{step.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Form Area */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-10 relative animation-fade-in">

                    {/* Mobile Progress Bar */}
                    <div className="md:hidden mb-8">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                            <span>Step {currentStep} of {totalSteps}</span>
                            <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-6 text-slate-800 border-b border-slate-100 pb-4">
                        {currentStep === 1 && "Start with your Personal Details"}
                        {currentStep === 2 && "How can we contact you?"}
                        {currentStep === 3 && "Tell us about your Education"}
                        {currentStep === 4 && "Final Review & Declaration"}
                    </h2>

                    {/* Step 1: Personal Info */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animation-slide-up">
                            {/* Photo Upload */}
                            <div className="flex justify-center mb-8">
                                <div onClick={() => profileInputRef.current?.click()}
                                    className="relative w-32 h-32 rounded-full bg-slate-50 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition overflow-hidden group">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Upload className="text-slate-400 mb-1 group-hover:text-blue-500" />
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500">Upload Photo</span>
                                        </>
                                    )}
                                    <input type="file" ref={profileInputRef} onChange={(e) => handleImageChange(e, 'profile')} className="hidden" accept="image/*" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className={labelClass}>First Name *</label><input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className={inputClass} placeholder="John" /></div>
                                <div><label className={labelClass}>Last Name *</label><input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className={inputClass} placeholder="Doe" /></div>
                                <div><label className={labelClass}>Middle Name</label><input type="text" value={formData.middleName} onChange={e => setFormData({ ...formData, middleName: e.target.value })} className={inputClass} placeholder="Optional" /></div>
                                <div><label className={labelClass}>Date of Birth *</label><input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} className={inputClass} /></div>
                                <div>
                                    <label className={labelClass}>Gender *</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inputClass}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div><label className={labelClass}>Nationality *</label><input type="text" value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={inputClass} placeholder="Ugandan" /></div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animation-slide-up">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2"><label className={labelClass}>Home Address *</label><input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputClass} placeholder="District, Village, Plot No." /></div>
                                <div><label className={labelClass}>Phone Number *</label><input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="+256 700 000000" /></div>
                                <div><label className={labelClass}>Email Address *</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="you@example.com" /></div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={18} /> Next of Kin</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div><label className={labelClass}>Name *</label><input type="text" value={formData.nokName} onChange={e => setFormData({ ...formData, nokName: e.target.value })} className={inputClass} placeholder="Parent/Guardian Name" /></div>
                                    <div><label className={labelClass}>Relationship *</label><input type="text" value={formData.nokRelationship} onChange={e => setFormData({ ...formData, nokRelationship: e.target.value })} className={inputClass} placeholder="Father, Mother, etc." /></div>
                                    <div><label className={labelClass}>Phone *</label><input type="tel" value={formData.nokPhone} onChange={e => setFormData({ ...formData, nokPhone: e.target.value })} className={inputClass} /></div>
                                    <div><label className={labelClass}>Address</label><input type="text" value={formData.nokAddress} onChange={e => setFormData({ ...formData, nokAddress: e.target.value })} className={inputClass} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Academics */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animation-slide-up">
                            <div>
                                <label className={labelClass}>Desired Programme(s) *</label>
                                <input type="text" value={formData.programmes} onChange={e => setFormData({ ...formData, programmes: e.target.value })} className={inputClass} placeholder="e.g. Diploma in Nursing" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className={labelClass}>Highest Qualification *</label><input type="text" value={formData.highestQualification} onChange={e => setFormData({ ...formData, highestQualification: e.target.value })} className={inputClass} placeholder="UACE, Diploma, etc." /></div>
                                <div><label className={labelClass}>Last Institution *</label><input type="text" value={formData.lastInstitution} onChange={e => setFormData({ ...formData, lastInstitution: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Completion Year</label><input type="text" value={formData.completionYear} onChange={e => setFormData({ ...formData, completionYear: e.target.value })} className={inputClass} placeholder="YYYY" /></div>
                                <div>
                                    <label className={labelClass}>Study Mode</label>
                                    <select value={formData.modeOfStudy} onChange={e => setFormData({ ...formData, modeOfStudy: e.target.value })} className={inputClass}>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Weekend</option>
                                    </select>
                                </div>
                            </div>

                            {/* Documents */}
                            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 flex flex-col items-center text-center cursor-pointer hover:bg-blue-100 transition"
                                onClick={() => resultsInputRef.current?.click()}>
                                {academicResults ? (
                                    <div className="flex items-center gap-3 text-blue-700 font-bold">
                                        <FileText /> Document Attached!
                                        <span className="text-xs bg-white px-2 py-1 rounded-full text-blue-500">Change</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="text-blue-500 mb-2" size={32} />
                                        <h4 className="font-bold text-slate-800">Upload Results / Transcript</h4>
                                        <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG (Max 5MB)</p>
                                    </>
                                )}
                                <input type="file" ref={resultsInputRef} onChange={e => handleImageChange(e, 'results')} className="hidden" />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Final */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animation-slide-up">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-4">Summary</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-500">Name</span>
                                        <span className="font-bold">{formData.firstName} {formData.lastName}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-500">Contact</span>
                                        <span className="font-bold">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-200 pb-2">
                                        <span className="text-slate-500">Programme</span>
                                        <span className="font-bold">{formData.programmes}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>How did you hear about us?</label>
                                <select value={formData.sourceOfInfo} onChange={e => setFormData({ ...formData, sourceOfInfo: e.target.value })} className={inputClass}>
                                    <option value="">Select...</option>
                                    <option>Social Media</option>
                                    <option>Friend / Family</option>
                                    <option>Radio / TV</option>
                                    <option>School Visit</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <label className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer">
                                <input type="checkbox" checked={formData.agreed} onChange={e => setFormData({ ...formData, agreed: e.target.checked })} className="mt-1 w-5 h-5 accent-orange-500" />
                                <span className="text-sm text-orange-900 leading-relaxed">
                                    I declare that the information provided is correct. I understand that false information may lead to disqualification.
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Nav Actions */}
                    <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
                        {currentStep > 1 ? (
                            <button onClick={prevStep} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition">
                                Back
                            </button>
                        ) : <div></div>}

                        {currentStep < totalSteps ? (
                            <button onClick={nextStep} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-slate-200">
                                Next Step <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={!formData.agreed || submitting} className={`bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-200 ${(!formData.agreed || submitting) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {submitting ? 'Submitting...' : 'Submit Form'} <Send size={18} />
                            </button>
                        )}
                    </div>

                </div>
            </div>

            <style jsx global>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animation-slide-up {
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
