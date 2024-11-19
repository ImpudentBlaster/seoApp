import { CalloutCard, Button, Grid, MediaCard, Page, LegacyCard, Stack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import '../SeoBooster/SEO_Booster.css'; // Adjust the path if necessary
import { useNavigate } from "react-router-dom";
const services = [
    {
        title: 'Bulk optimize',
        description:
            'Use content templates to optimize your meta data in bulk and ensure your pages meta data follow the same format. This will save you hours of time and effort.',
        buttonText: 'Configure',
        // url: "/SeoOptimizationMain"
    },
    {
        title: 'Manual optimize',
        description:
            'Optimize your meta title/description one-by-one, manually or using our AI feature. This will take more time, however will ensure the best optimization for each page.',
        buttonText: 'Configure',
        url: "/SeoOptimization"
    },

];

export default function MetaOptimization() {
    console.log(window.location)
    const { t } = useTranslation();
    const navigate = useNavigate()
    const urlParams = new URLSearchParams(window.location.search);
const shopName = urlParams.get('shop');

    const navigateHanlde = (url) => {
        if (url) {
        navigate(`${url}?shop=${shopName}`);// Dynamically navigate to the URL
        } else {
            console.log("URL not found");
        }
    };



    const handleBack = () => {
        navigate(`/SeoBooster/SEO_Booster?shop=${shopName}`);
    };

    return (

        <Page title="Meta title/description optimization" backAction={{ content: 'Products', onAction: handleBack }}>
            <TitleBar >

            </TitleBar>


            {/* Responsive grid for the LegacyCards */}
            <div className=" gird_container">
                <Grid>
                    {services.map((service, index) => (
                        <Grid.Cell
                            key={index}
                            columnSpan={{ xs: 12, sm: 6, md: 6, lg: 6 }} // Full width on xs, 2 cards per row on larger screens
                        >
                            <LegacyCard title={service.title} sectioned
                            >
                                <Stack distribution="equalSpacing" alignment="center">
                                    <p>{service.description}</p>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <Button onClick={() => navigateHanlde(service.url)} className="black-button" variant="primary">{service.buttonText}</Button>
                                    </div>
                                </Stack>
                            </LegacyCard>
                        </Grid.Cell>
                    ))}
                </Grid>

            </div>

        </Page>
    );
}

