import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SchoolApplicationClient from './ApplicationForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Props {
    params: { schoolId: string };
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { schoolId } = await params;

    // Fetch school data from platform settings
    const { data } = await supabase
        .from('platform_settings')
        .select('featured_schools')
        .eq('id', 1)
        .single();

    const schools = data?.featured_schools || [];
    const school = schools.find((s: any) => String(s.id) === String(schoolId));

    if (!school) {
        return {
            title: 'Admission Portal | SAMI School Platform',
            description: 'Apply now to our featured institutions.',
        };
    }

    const schoolName = school.name || 'Institution';
    const description = `Apply now to ${schoolName} through the official admission portal. Start your educational journey today.`;
    
    // Use the absolute URL for the social preview image (crucial for WhatsApp/Facebook)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://compass-360.vercel.app';
    const logoUrl = `${baseUrl}/api/badges/${schoolId}/logo`;

    return {
        title: `Apply to ${schoolName} | Admission Portal`,
        description: description,
        openGraph: {
            title: `Apply to ${schoolName} | Admission Portal`,
            description: description,
            images: [
                {
                    url: logoUrl,
                    width: 800,
                    height: 800,
                    alt: `${schoolName} Logo`,
                },
            ],
            type: 'website',
            url: `${baseUrl}/apply/${schoolId}`,
        },
        twitter: {
            card: 'summary_large_image',
            title: `Apply to ${schoolName} | Admission Portal`,
            description: description,
            images: [logoUrl],
        },
    };
}

export default async function Page({ params }: Props) {
    const { schoolId } = await params;

    let query = supabase.from('featured_schools').select('*');
    if (String(schoolId).startsWith('sch_')) {
        query = query.eq('name', 'SAMI HEALTH SCIENCE INSTITUTE');
    } else {
        query = query.eq('id', String(schoolId).trim());
    }

    const { data: schoolData, error } = await query.maybeSingle();

    let formattedSchool = null;

    if (!error && schoolData) {
        let parsedGallery: string[] = [];
        try {
            if (Array.isArray(schoolData.gallery)) parsedGallery = schoolData.gallery;
            else if (typeof schoolData.gallery === 'string') parsedGallery = JSON.parse(schoolData.gallery);
        } catch(e) { /* ignore parse error */ }

        formattedSchool = {
            id: schoolData.id,
            name: schoolData.name || '',
            category: schoolData.category || '',
            logo: schoolData.logo_url ? String(schoolData.logo_url).trim() : '',
            image: schoolData.cover_url ? String(schoolData.cover_url).trim() : '',
            tagline: schoolData.tagline || '',
            description: schoolData.description || '',
            location: schoolData.location || '',
            contact: schoolData.contact_phone || '',
            email: schoolData.contact_email || '',
            enrollmentStatus: schoolData.enrollment_status || '', 
            feesStructure: schoolData.fees_url ? String(schoolData.fees_url).trim() : '', 
            gallery: parsedGallery,
            status: 'Active'
        };
    }

    return <SchoolApplicationClient schoolId={schoolId} initialData={formattedSchool} />;
}
