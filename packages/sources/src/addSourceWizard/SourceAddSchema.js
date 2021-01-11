import React from 'react';
import { useIntl } from 'react-intl';
import componentTypes from '@data-driven-forms/react-form-renderer/dist/cjs/component-types';
import validatorTypes from '@data-driven-forms/react-form-renderer/dist/cjs/validator-types';
import { TextContent, Text, TextVariants } from '@patternfly/react-core';
import debouncePromise from '../utilities/debouncePromise';
import { findSource } from '../api';
import { schemaBuilder } from './schemaBuilder';
import { getActiveVendor, REDHAT_VENDOR, WIZARD_DESCRIPTION, WIZARD_TITLE } from '../utilities/stringConstants';
import ValidatorReset from './ValidatorReset';
import { handleError } from '../api/handleError';
import validated from '../sourceFormRenderer/resolveProps/validated';

export const asyncValidator = async (value, sourceId = undefined, intl) => {
    if (!value) {
        return undefined;
    }

    let response;
    try {
        response = await findSource(value);
    } catch (error) {
        console.error(handleError(error));
        return undefined;
    }

    if (response.data.sources.find(({ id }) => id !== sourceId)) {
        throw intl.formatMessage({ defaultMessage: 'That name is taken. Try another.', id: 'wizard.nameTaken' });
    }

    return undefined;
};

let firstValidation = true;
export const setFirstValidated = (bool) => firstValidation = bool;
export const getFirstValidated = () => firstValidation;

export const asyncValidatorDebounced = debouncePromise(asyncValidator);

export const asyncValidatorDebouncedWrapper = (intl) => {
    if (getFirstValidated()) {
        setFirstValidated(false);
        return (value, id) => value ? asyncValidator(value, id, intl) : undefined;
    }

    return asyncValidatorDebounced;
};

const compileAllSourcesComboOptions = (sourceTypes) => (
    [
        ...sourceTypes.map((type) => (
            {
                ...type,
                product_name: type.vendor === 'Red Hat' ? type.product_name.replace('Red Hat ', '') : type.product_name
            })).sort((a, b) => a.product_name.localeCompare(b.product_name)).map(t => ({
            value: t.name,
            label: t.product_name
        }))
    ]
);

export const compileAllApplicationComboOptions = (applicationTypes, intl) => (
    [
        ...(getActiveVendor() !== REDHAT_VENDOR ? [{
            label: intl.formatMessage({
                id: 'wizard.none',
                defaultMessage: 'None'
            }),
            key: 'none'
        }] : []),
        ...applicationTypes.sort((a, b) => a.display_name.localeCompare(b.display_name)).map(t => ({
            value: t.id,
            label: t.display_name
        }))
    ]
);

export const appMutator = (appTypes) => (option, formOptions) => {
    if (!option.value) {
        return option;
    }

    const selectedSourceType = formOptions.getState().values.source_type;
    const appType = appTypes.find(app => app.display_name === option.label);
    const isEnabled = selectedSourceType ? appType.supported_source_types.includes(selectedSourceType) : true;
    return {
        ...option,
        isDisabled: !isEnabled
    };
};

export const appMutatorRedHat = (appTypes) => (option, formOptions) => {
    const selectedSourceType = formOptions.getState().values.source_type;
    const appType = appTypes.find(app => app.display_name === option.label);
    const isEnabled = selectedSourceType ? appType.supported_source_types.includes(selectedSourceType) : true;

    if (!isEnabled) {
        return;
    }

    return option;
};

export const sourceTypeMutator = (appTypes, sourceTypes) => (option, formOptions) => {
    const selectedApp = formOptions.getState().values.application ? formOptions.getState().values.application.application_type_id : undefined;
    const appType = appTypes.find(app => app.id === selectedApp);
    const isEnabled = appType ? appType.supported_source_types.includes(sourceTypes.find(type => type.product_name === option.label).name) : true;
    return {
        ...option,
        isDisabled: !isEnabled
    };
};

const shortIcons = {
    amazon: '/apps/frontend-assets/partners-icons/aws.svg',
    'ansible-tower': '/apps/frontend-assets/red-hat-logos/stacked.svg',
    azure: '/apps/frontend-assets/partners-icons/microsoft-azure-short.svg',
    openshift: '/apps/frontend-assets/red-hat-logos/stacked.svg',
    satellite: '/apps/frontend-assets/red-hat-logos/stacked.svg',
    google: '/apps/frontend-assets/partners-icons/google-cloud-short.svg'
};

export const iconMapper = sourceTypes => (name) => {
    const sourceType = sourceTypes.find((type) => type.name === name);

    if (!sourceType || (sourceType.icon_url && !shortIcons[name])) {
        return null;
    }

    const Icon = () => <img
        src={shortIcons[name] || sourceType.icon_url}
        alt={sourceType.product_name}
        className={`ins-c-sources__wizard--icon ${sourceType.vendor === 'Red Hat' ? 'redhat-icon' : 'pf-u-mb-sm'}`}
    />;

    return Icon;
};

export const nextStep = ({ values: { application, source_type } }) => {
    const appId = application && application.application_type_id;
    const resultedStep = appId ? `${source_type}-${appId}` : source_type;

    return resultedStep;
};

const sourceTypeSelect = ({ intl, sourceTypes, applicationTypes }) => ({
    component: 'card-select',
    name: 'source_type',
    isRequired: true,
    label: intl.formatMessage({
        id: 'wizard.selectYourSourceType',
        defaultMessage: 'A. Select your source type'
    }),
    iconMapper: iconMapper(sourceTypes),
    validate: [{
        type: validatorTypes.REQUIRED
    }],
    options: compileAllSourcesComboOptions(sourceTypes, applicationTypes)
});

const cloudTypes = ({ intl, sourceTypes, applicationTypes, disableAppSelection }) => ([
    {
        ...sourceTypeSelect({ intl, sourceTypes, applicationTypes }),
        mutator: sourceTypeMutator(applicationTypes, sourceTypes)
    },
    {
        component: 'enhanced-select',
        name: 'application.application_type_id',
        label: intl.formatMessage({
            id: 'wizard.selectYourApplication',
            defaultMessage: 'B. Select an application'
        }),
        options: compileAllApplicationComboOptions(applicationTypes, intl, sourceTypes),
        mutator: appMutator(applicationTypes),
        isDisabled: disableAppSelection,
        placeholder: intl.formatMessage({ id: 'wizard.chooseApp', defaultMessage: 'Choose application' }),
        menuIsPortal: true
    }
]);

const redhatTypes = ({ intl, sourceTypes, applicationTypes, disableAppSelection }) => ([
    sourceTypeSelect({ intl, sourceTypes, applicationTypes }),
    {
        component: 'enhanced-radio',
        name: 'application.application_type_id',
        label: intl.formatMessage({
            id: 'wizard.selectApplication',
            defaultMessage: 'B. Application'
        }),
        options: compileAllApplicationComboOptions(applicationTypes, intl, sourceTypes),
        mutator: appMutatorRedHat(applicationTypes),
        isDisabled: disableAppSelection,
        isRequired: true,
        validate: [{ type: validatorTypes.REQUIRED }],
        condition: { when: 'source_type', isNotEmpty: true }
    }
]);

export const applicationStep = (applicationTypes, selectedType, intl) => ({
    name: 'types_step',
    title: intl.formatMessage({
        id: 'wizard.Application',
        defaultMessage: 'Application'
    }),
    nextStep,
    fields: [{
        component: componentTypes.PLAIN_TEXT,
        name: 'app-description',
        label: intl.formatMessage({
            id: 'wizard.applicationDescription',
            defaultMessage: 'Select an application to configure this source. You can connect additional applications after source creation.'
        })
    }, {
        component: 'enhanced-select',
        name: 'application.application_type_id',
        label: intl.formatMessage({
            id: 'wizard.selectYourApplicationNoPoint',
            defaultMessage: 'Select an application'
        }),
        options: compileAllApplicationComboOptions(
            applicationTypes.filter(({ supported_source_types }) => supported_source_types.includes(selectedType)),
            intl
        ),
        mutator: appMutator(applicationTypes),
        placeholder: intl.formatMessage({ id: 'wizard.chooseApp', defaultMessage: 'Choose application' }),
        menuIsPortal: true
    }, {
        component: componentTypes.TEXT_FIELD,
        name: 'source_type',
        hideField: true
    }]
});

export const typesStep = (sourceTypes, applicationTypes, disableAppSelection, intl) => ({
    title: intl.formatMessage({
        id: 'wizard.chooseAppAndType',
        defaultMessage: 'Source type and application'
    }),
    name: 'types_step',
    nextStep,
    fields: [
        ...(getActiveVendor() === REDHAT_VENDOR
            ? redhatTypes({ intl, sourceTypes, applicationTypes, disableAppSelection })
            : cloudTypes({ intl, sourceTypes, applicationTypes, disableAppSelection })
        ),
        {
            component: 'description',
            name: 'fixasyncvalidation',
            Content: ValidatorReset
        }
    ]
});

export const NameDescription = () => {
    const intl = useIntl();

    return (
        <TextContent key='step1'>
            <Text component={ TextVariants.p }>
                { intl.formatMessage({
                    id: 'wizard.nameDescription',
                    // eslint-disable-next-line max-len
                    defaultMessage: 'To import data for an application, you need to connect to a data source. Enter a name, then proceed to select your application and source type.'
                }) }
            </Text>
        </TextContent>
    );
};

const nameStep = (intl) => ({
    title: intl.formatMessage({
        id: 'wizard.name',
        defaultMessage: 'Name'
    }),
    name: 'name_step',
    nextStep: 'types_step',
    fields: [
        {
            component: 'description',
            name: 'description-summary',
            Content: NameDescription
        },
        {
            component: componentTypes.TEXT_FIELD,
            name: 'source.name',
            type: 'text',
            label: intl.formatMessage({
                id: 'wizard.name',
                defaultMessage: 'Name'
            }),
            placeholder: 'Source_1',
            isRequired: true,
            validate: [
                (value) => asyncValidatorDebouncedWrapper(intl)(value, undefined, intl),
                { type: validatorTypes.REQUIRED }
            ],
            resolveProps: validated
        }
    ]
});

export const SummaryDescription = () => {
    const intl = useIntl();

    return (
        <TextContent>
            <Text component={ TextVariants.p }>
                { intl.formatMessage({
                    id: 'wizard.summaryDescription',
                    defaultMessage: 'Review the information below and click Add to add your source. Use the Back button to make changes.'
                }) }
            </Text>
        </TextContent>
    );
};

const summaryStep = (sourceTypes, applicationTypes, intl) => ({
    fields: [
        {
            component: 'description',
            name: 'description-summary',
            Content: SummaryDescription
        },
        {
            name: 'summary',
            component: 'summary',
            sourceTypes,
            applicationTypes
        }],
    name: 'summary',
    title: intl.formatMessage({
        id: 'wizard.reviewDetails',
        defaultMessage: 'Review details'
    })
});

export default (sourceTypes, applicationTypes, disableAppSelection, container, intl, selectedType) => {
    setFirstValidated(true);

    return ({
        fields: [{
            component: componentTypes.WIZARD,
            name: 'wizard',
            title: WIZARD_TITLE(),
            inModal: true,
            description: WIZARD_DESCRIPTION(),
            buttonLabels: {
                submit: intl.formatMessage({
                    id: 'sources.add',
                    defaultMessage: 'Add'
                }),
                back: intl.formatMessage({
                    id: 'wizard.back',
                    defaultMessage: 'Back'
                }),
                cancel: intl.formatMessage({
                    id: 'wizard.cancel',
                    defaultMessage: 'Cancel'
                }),
                next: intl.formatMessage({
                    id: 'wizard.next',
                    defaultMessage: 'Next'
                })
            },
            container,
            showTitles: true,
            crossroads: [ 'application.application_type_id', 'source_type', 'auth_select' ],
            fields: [
                nameStep(intl),
                selectedType
                    ? applicationStep(applicationTypes, selectedType, intl)
                    : typesStep(sourceTypes, applicationTypes, disableAppSelection, intl),
                ...schemaBuilder(sourceTypes, applicationTypes),
                summaryStep(sourceTypes, applicationTypes, intl)
            ]
        }]
    });
};
