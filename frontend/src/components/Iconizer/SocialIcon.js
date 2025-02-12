
import FacebookIcon from '@mui/icons-material/Facebook';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageIcon from '@mui/icons-material/Language';

function SocialIcon(props){

    const {platform} = props
    
    
    return (
        <>
            {platform === "facebook" &&
                (
                <FacebookIcon/>
                )
            }
            {platform === "whatsapp" &&
                (
                <WhatsAppIcon/>
                )
            }
            {platform === "instagram" &&
                (
                <InstagramIcon/>
                )
            }
            {platform === "website" &&
                (
                <LanguageIcon/>
                )
            }
            
        </>
        
    )
};

export default SocialIcon;