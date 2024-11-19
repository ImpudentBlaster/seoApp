
import React, { useState } from 'react';
import { Modal, Button, TextField, Stack, Checkbox } from '@shopify/polaris';

const SeoOptimizationButton = ({ productId }) => {
  const [active, setActive] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [forceTitleCut, setForceTitleCut] = useState(false);
  const [forceDescriptionCut, setForceDescriptionCut] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const shopName = urlParams.get('shop');

  const handleChange = () => setActive(!active);

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/update-product-meta/${shopName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          metaTitle: metaTitle,
          metaDescription: metaDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Product updated successfully:', data);
      } else {
        const errorData = await response.json();
        console.error('Error updating product:', errorData);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setActive(false);
    }
  };

  return (
    <div>
      <Button onClick={handleChange}>Click</Button>

      <Modal
        open={active}
        onClose={handleChange}
        title="SEO Optimization"
        primaryAction={{
          content: 'Save',
          onAction: handleSave,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleChange,
          },
        ]}
      >
        <Modal.Section>
          <Stack vertical>
            <TextField
              label="Meta title"
              value={metaTitle}
              onChange={(value) => setMetaTitle(value)}
              placeholder="Enter meta title"
            />
            <Checkbox
              label="Force cut meta title length if longer than 70 characters"
              checked={forceTitleCut}
              onChange={(checked) => setForceTitleCut(checked)}
            />
            <TextField
              label="Meta description"
              value={metaDescription}
              onChange={(value) => setMetaDescription(value)}
              placeholder="Enter meta description"
              multiline={3}
            />
            <Checkbox
              label="Force cut meta description length if longer than 160 characters"
              checked={forceDescriptionCut}
              onChange={(checked) => setForceDescriptionCut(checked)}
            />
          </Stack>
        </Modal.Section>
      </Modal>
    </div>
  );
};

export default SeoOptimizationButton;



