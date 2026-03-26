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
    
    // 1. Fetch exactly from the cloud 'featured_schools' table
    const { data: school } = await supabase
        .from('featured_schools')
        .select('name, tagline, logo_url, cover_url')
        .eq('id', schoolId)
        .single();

    if (!school) {
        return {
            title: 'School Application | Compass 360',
            description: 'Apply now to our featured institutions.',
        };
    }

    const schoolName = school.name || 'Institution';
    const schoolLogo = school.logo_url || '/logo.png';
    const schoolCover = school.cover_url || '';

    return {
        metadataBase: new URL('https://compass-360.vercel.app'),
        title: `Apply to ${schoolName} | Admission Portal`,
        description: school.tagline || `Start your educational journey at ${schoolName} today.`,
        openGraph: {
            title: `Apply to ${schoolName} | Admission Portal`,
            description: school.tagline || 'Submit your application through the official Compass 360 portal.',
            url: `https://compass-360.vercel.app/apply/${schoolId}`,
            siteName: 'Compass 360',
            images: [
                {
                    url: schoolCover || schoolLogo,
                    width: 1200,
                    height: 630,
                    alt: schoolName,
                }
            ],
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: `Apply to ${schoolName} | Admission Portal`,
            description: school.tagline || 'Submit your application through the official Compass 360 portal.',
            images: [schoolCover || schoolLogo],
        }
    };
}

export default async function Page({ params }: Props) {
    const { schoolId } = await params;

    // 1. Fetch from the dedicated Cloud table
    const { data: dbSchool } = await supabase
        .from('featured_schools')
        .select('*')
        .eq('id', schoolId)
        .single();
    
    let formattedSchool = null;

    if (dbSchool) {
        let parsedGallery: string[] = [];
        try {
            if (Array.isArray(dbSchool.gallery)) parsedGallery = dbSchool.gallery;
            else if (typeof dbSchool.gallery === 'string') parsedGallery = JSON.parse(dbSchool.gallery);
        } catch(e) { }

        formattedSchool = {
            id: dbSchool.id,
            name: dbSchool.name || '',
            category: dbSchool.category || 'Academy',
            logo: dbSchool.logo_url || '',
            image: dbSchool.cover_url || '',
            tagline: dbSchool.tagline || '',
            description: dbSchool.description || '',
            location: dbSchool.location || '',
            contact: dbSchool.contact_phone || '',
            email: dbSchool.contact_email || '',
            enrollmentStatus: dbSchool.enrollment_status || 'Open', 
            fees_url: dbSchool.fees_url || '',
            gallery: parsedGallery,
            status: 'Active'
        };
    }

    // 2. Render the client. If school is STILL null, the client's internal "Not Found" UI will trigger.
    return <SchoolApplicationClient schoolId={schoolId} initialData={formattedSchool} />;
}
