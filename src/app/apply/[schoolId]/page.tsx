"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSchoolData, FeaturedSchool } from '@/lib/store';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function SchoolApplicationPage() {
    const router = useRouter();
    const params = useParams();
    const schoolId = params?.schoolId as string;

    const { featuredSchools, addSchoolApplication } = useSchoolData();
    const [school, setSchool] = useState<FeaturedSchool | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        // Personal Info
        firstName: '',
        middleName: '',
        lastName: '',
        dob: '',
        gender: '',
        nationality: '',
        phone: '',
        email: '',
        address: '',

        // Programme Interest
        programmes: '',
        entryLevel: '',
        modeOfStudy: 'Full-time',

        // Academic Background
        highestQualification: '',
        lastInstitution: '',
        completionYear: '',
        examBody: '',
        indexNumber: '',

        // Source
        sourceOfInfo: '',
        sourceOrgName: '',
        sourceFriendName: '',
        sourceOther: '',

        // Next of Kin
        nokName: '',
        nokRelationship: '',
        nokPhone: '',
        nokAddress: '',

        // Declaration
        agreed: false
    });

    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [academicResults, setAcademicResults] = useState<string | null>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);
    const resultsInputRef = useRef<HTMLInputElement>(null);

    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!schoolId) return;

        // Robust lookup: handle existing numeric IDs and new string IDs
        const found = featuredSchools.find(s => String(s.id) === String(schoolId));
        if (found) {
            setSchool(found);
            setNotFound(false);
        } else {
            // Give it a small delay to ensure hydration is complete
            const timer = setTimeout(() => {
                if (!school) setNotFound(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [schoolId, featuredSchools, school]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'results') => {
        const file = e.target.files?.[0];
        if (file) {
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                alert('Please upload JPG or PNG files only.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === 'profile') setProfilePhoto(reader.result as string);
                else setAcademicResults(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const [errorOnce, setErrorOnce] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!school) return;

        if (!formData.agreed) {
            setErrorOnce(true);
            const declarationEl = document.getElementById('declaration-section');
            if (declarationEl) declarationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setSubmitting(true);

        // Add to store
        addSchoolApplication({
            schoolId: school.id,
            schoolName: school.name,
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

    if (notFound) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
                <div style={{ background: 'white', padding: '3rem', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>School Not Found</h1>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                        We couldn't find the school you're looking for. It may have been removed or the link might be incorrect.
                    </p>
                    <Link href="/">
                        <button style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'black', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                            Back to Homepage
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!school) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '50px', height: '50px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                    <p style={{ color: '#64748b' }}>Loading school information...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
                <div style={{ background: 'white', padding: '3.5rem', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', maxWidth: '800px', width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🎊</div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', marginBottom: '1rem' }}>Application Sent!</h1>
                    <p style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '3rem', lineHeight: '1.6' }}>
                        Your application to <strong>{school.name}</strong> has been received successfully.
                    </p>

                    <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '24px', textAlign: 'left', border: '1px solid #e2e8f0', marginBottom: '3rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>📫</span> What happens next?
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#475569', display: 'flex', gap: '1rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>1.</span> A school representative will review your documents.
                            </p>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#475569', display: 'flex', gap: '1rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>2.</span> You will receive a phone call within 2-3 business days.
                            </p>
                            <p style={{ margin: 0, fontSize: '1rem', color: '#475569', display: 'flex', gap: '1rem' }}>
                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>3.</span> Confirmation will be sent to your email address.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button
                            onClick={() => router.push('/')}
                            style={{ padding: '1.2rem', borderRadius: '18px', background: 'black', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '1.1rem' }}
                        >
                            Return to Homepage
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const inputStyle = {
        width: '100%',
        padding: '0.8rem 1rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        fontSize: '1rem',
        outlineColor: '#3b82f6',
        background: '#fff',
        transition: 'border-color 0.2s'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        color: '#334155' // Darker for visibility
    };

    const sectionTitleStyle = {
        fontSize: '1.1rem',
        fontWeight: '900', // Thicker
        color: '#0f172a', // Darker
        marginBottom: '1.2rem',
        borderBottom: '2px solid #e2e8f0', // More visible border
        paddingBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    const sectionWrapperStyle = {
        background: '#f8fafc',
        padding: '1.5rem',
        borderRadius: '20px',
        border: '1px solid #f1f5f9',
        marginBottom: '2rem'
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '4rem 1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <Link href="/" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    ← Back to Schools
                </Link>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2.5rem', alignItems: 'start' }}>
                    {/* Left Sidebar: School Info */}
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#f1f5f9', overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                                    <img src={school.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=Logo'} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#3b82f6', letterSpacing: '0.05em' }}>{school.category}</span>
                                    <h1 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0', color: '#0f172a' }}>{school.name}</h1>
                                </div>
                            </div>

                            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                                <img src={school.image} alt={school.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem', fontWeight: '500' }}>{school.tagline}</p>

                            <div style={{ display: 'grid', gap: '1rem', padding: '1.2rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.2rem' }}>Contact</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b' }}>{school.contact || 'Not listed'}</p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.2rem' }}>Email</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6' }}>{school.email || 'Not listed'}</p>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.2rem' }}>Location</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b' }}>{school.location || 'Not listed'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Content: Admission Form */}
                    <div style={{ background: 'white', padding: '3rem', borderRadius: '32px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.5rem' }}>
                                <div
                                    onClick={() => profileInputRef.current?.click()}
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '30px',
                                        background: '#f1f5f9',
                                        border: '3px dashed #cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease',
                                        position: 'relative'
                                    }}
                                >
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>🧑</div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Upload Photo</div>
                                        </div>
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: 0,
                                        background: '#3b82f6',
                                        color: 'white',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '10px 0 0 0'
                                    }}>
                                        +
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={profileInputRef}
                                    onChange={(e) => handleImageChange(e, 'profile')}
                                    accept="image/jpeg,image/png"
                                    style={{ display: 'none' }}
                                />
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.8rem' }}>Passport size photo (JPG, PNG)</p>
                            </div>

                            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Admission Form</h2>
                            <p style={{ color: '#64748b' }}>Complete all sections carefully to apply for <strong>{school.name}</strong></p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* A. Personal Information */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>A.</span> Personal Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                    <div style={{ gridColumn: 'span 1' }}>
                                        <label style={labelStyle}>First Name</label>
                                        <input required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} style={inputStyle} placeholder="e.g. John" />
                                    </div>
                                    <div style={{ gridColumn: 'span 1' }}>
                                        <label style={labelStyle}>Last Name</label>
                                        <input required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} style={inputStyle} placeholder="e.g. Doe" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Middle Name (Optional)</label>
                                        <input type="text" value={formData.middleName} onChange={(e) => setFormData({ ...formData, middleName: e.target.value })} style={inputStyle} placeholder="e.g. William" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Date of Birth</label>
                                        <input required type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Gender</label>
                                        <select required value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} style={inputStyle}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Nationality</label>
                                        <input required type="text" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} style={inputStyle} placeholder="e.g. Ugandan" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Phone Number</label>
                                        <input required type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} placeholder="+256..." />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input required type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} placeholder="john.doe@example.com" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Home Address / District</label>
                                        <input required type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={inputStyle} placeholder="e.g. Kampala, Central" />
                                    </div>
                                </div>
                            </div>

                            {/* B. Programme Interest */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>B.</span> Programme Interest</h3>
                                <div style={{ display: 'grid', gap: '1.2rem' }}>
                                    <div>
                                        <label style={labelStyle}>Desired Programme(s)</label>
                                        <input required type="text" value={formData.programmes} onChange={(e) => setFormData({ ...formData, programmes: e.target.value })} style={inputStyle} placeholder="e.g. Diploma in Nursing, Midwifery" />
                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem' }}>Type one or multiple programmes you wish to pursue</p>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                        <div>
                                            <label style={labelStyle}>Intended Entry Level</label>
                                            <input required type="text" value={formData.entryLevel} onChange={(e) => setFormData({ ...formData, entryLevel: e.target.value })} style={inputStyle} placeholder="e.g. Year 1, Semester 1" />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Mode of Study</label>
                                            <select required value={formData.modeOfStudy} onChange={(e) => setFormData({ ...formData, modeOfStudy: e.target.value })} style={inputStyle}>
                                                <option value="Full-time">Full-time</option>
                                                <option value="Part-time">Part-time</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* C. Academic Background */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>C.</span> Academic Background</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Highest Qualification Attained</label>
                                        <input required type="text" value={formData.highestQualification} onChange={(e) => setFormData({ ...formData, highestQualification: e.target.value })} style={inputStyle} placeholder="e.g. UACE Certificate" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Name of Institution Last Attended</label>
                                        <input required type="text" value={formData.lastInstitution} onChange={(e) => setFormData({ ...formData, lastInstitution: e.target.value })} style={inputStyle} placeholder="e.g. King's College Budo" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Year of Completion</label>
                                        <input required type="text" value={formData.completionYear} onChange={(e) => setFormData({ ...formData, completionYear: e.target.value })} style={inputStyle} placeholder="e.g. 2023" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Examination Body</label>
                                        <input required type="text" value={formData.examBody} onChange={(e) => setFormData({ ...formData, examBody: e.target.value })} style={inputStyle} placeholder="e.g. UNEB, UBTEB" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Index / Registration Number (if applicable)</label>
                                        <input type="text" value={formData.indexNumber} onChange={(e) => setFormData({ ...formData, indexNumber: e.target.value })} style={inputStyle} placeholder="e.g. U0001/501" />
                                    </div>
                                </div>
                            </div>

                            {/* D. Academic Results */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>D.</span> Academic Results</h3>
                                <div
                                    onClick={() => resultsInputRef.current?.click()}
                                    style={{
                                        width: '100%',
                                        minHeight: '180px',
                                        borderRadius: '20px',
                                        background: 'white',
                                        border: '2px dashed #e2e8f0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        padding: '1.5rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {academicResults ? (
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <img src={academicResults} alt="Results" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '12px' }} />
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '0.7rem' }}>Click to change</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📄</div>
                                            <p style={{ fontWeight: '600', color: '#1e293b', marginBottom: '0.3rem' }}>Upload Result Slip / Transcript</p>
                                            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>JPG or PNG only</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={resultsInputRef}
                                    onChange={(e) => handleImageChange(e, 'results')}
                                    accept="image/jpeg,image/png"
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* E. How Did You Get to Know About the School? */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>E.</span> Marketing Info</h3>
                                <div style={{ display: 'grid', gap: '1.2rem' }}>
                                    <div>
                                        <label style={labelStyle}>How did you get to know about the school?</label>
                                        <select
                                            required
                                            value={formData.sourceOfInfo}
                                            onChange={(e) => setFormData({ ...formData, sourceOfInfo: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="">Select Source</option>
                                            <option value="Bursary Organisation">Bursary Organisation</option>
                                            <option value="TikTok">TikTok</option>
                                            <option value="A Friend">A Friend</option>
                                            <option value="Self">Self</option>
                                            <option value="Radio">Radio</option>
                                            <option value="Advertisement">Advertisement</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    {formData.sourceOfInfo === 'Bursary Organisation' && (
                                        <div>
                                            <label style={labelStyle}>Enter Name of Organisation</label>
                                            <input required type="text" value={formData.sourceOrgName} onChange={(e) => setFormData({ ...formData, sourceOrgName: e.target.value })} style={inputStyle} placeholder="Name of organization" />
                                        </div>
                                    )}

                                    {formData.sourceOfInfo === 'A Friend' && (
                                        <div>
                                            <label style={labelStyle}>Enter Friend's Name</label>
                                            <input required type="text" value={formData.sourceFriendName} onChange={(e) => setFormData({ ...formData, sourceFriendName: e.target.value })} style={inputStyle} placeholder="Friend's full name" />
                                        </div>
                                    )}

                                    {formData.sourceOfInfo === 'Other' && (
                                        <div>
                                            <label style={labelStyle}>Please specify</label>
                                            <input required type="text" value={formData.sourceOther} onChange={(e) => setFormData({ ...formData, sourceOther: e.target.value })} style={inputStyle} placeholder="Tell us more" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* F. Next of Kin */}
                            <div style={sectionWrapperStyle}>
                                <h3 style={sectionTitleStyle}><span>F.</span> Next of Kin / Emergency Contact</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Full Name</label>
                                        <input required type="text" value={formData.nokName} onChange={(e) => setFormData({ ...formData, nokName: e.target.value })} style={inputStyle} placeholder="Guardian or relative name" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Relationship</label>
                                        <input required type="text" value={formData.nokRelationship} onChange={(e) => setFormData({ ...formData, nokRelationship: e.target.value })} style={inputStyle} placeholder="e.g. Father, Mother" />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Phone Number</label>
                                        <input required type="tel" value={formData.nokPhone} onChange={(e) => setFormData({ ...formData, nokPhone: e.target.value })} style={inputStyle} placeholder="+256..." />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label style={labelStyle}>Address</label>
                                        <input required type="text" value={formData.nokAddress} onChange={(e) => setFormData({ ...formData, nokAddress: e.target.value })} style={inputStyle} placeholder="Residential address" />
                                    </div>
                                </div>
                            </div>

                            {/* G. Declaration */}
                            <div
                                id="declaration-section"
                                style={{
                                    ...sectionWrapperStyle,
                                    background: errorOnce && !formData.agreed ? '#fff1f2' : '#fffbeb',
                                    border: errorOnce && !formData.agreed ? '2px solid #ef4444' : '1px solid #fde68a',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <h3 style={{ ...sectionTitleStyle, borderBottomColor: errorOnce && !formData.agreed ? '#fecaca' : '#fef3c7' }}><span>G.</span> Declaration</h3>
                                <p style={{ fontSize: '0.95rem', color: errorOnce && !formData.agreed ? '#991b1b' : '#92400e', marginBottom: '1.2rem', lineHeight: '1.5', fontWeight: errorOnce && !formData.agreed ? 'bold' : 'normal' }}>
                                    I declare that the information provided above is true and correct to the best of my knowledge.
                                </p>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', color: '#1e293b', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.agreed}
                                        onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                                        style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                    />
                                    <span>I agree to the declaration above</span>
                                </label>
                                {errorOnce && !formData.agreed && (
                                    <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span>⚠️</span> Please agree to the declaration before submitting.
                                    </p>
                                )}
                            </div>

                            {/* H. Submission Notice */}
                            <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📢</span> Important Notice
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', marginBottom: '1rem' }}>
                                    After submitting this application, you will receive a phone call from the school and an email with further instructions.
                                </p>
                                <ul style={{ fontSize: '0.8rem', color: '#64748b', paddingLeft: '1.2rem', margin: 0 }}>
                                    <li>Submission does not guarantee admission</li>
                                    <li>The school will contact you after reviewing your application</li>
                                </ul>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                style={{
                                    width: '100%',
                                    padding: '1.4rem',
                                    borderRadius: '16px',
                                    background: 'black',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: '800',
                                    cursor: submitting ? 'not-allowed' : 'pointer',
                                    opacity: submitting ? 0.7 : 1,
                                    fontSize: '1.1rem',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                }}
                            >
                                {submitting ? (
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                                        Processing Application...
                                    </span>
                                ) : 'Submit Application'}
                            </button>
                            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
